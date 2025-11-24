import express from "express";
import multer from "multer";
import fs from "fs";
import StoredObject from "../models/StoredObject";
import User from "../models/User";
import { ENV } from "../config/env";
import { uploadBufferToStoracha, computeCIDForBuffer, PREVIEW_LOCAL_PATH } from "../services/StorachaClient";
import { computeUploadRequiredCredits } from "../services/pricing";

const router = express.Router();
const uploadDir = ENV.UPLOAD_TEMP_DIR;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const multerUpload = multer({ storage, limits: { fileSize: ENV.MAX_FILE_SIZE } });

router.get("/health", (_, res) => res.json({ success: true, uptime: process.uptime() }));

router.get("/api/storage/account", async (req, res) => {
  const walletRaw = (req.query.wallet as string) || (req.headers["x-wallet"] as string);
  const wallet = walletRaw ? walletRaw.toLowerCase() : "";
  if (!wallet) return res.status(400).json({ success: false, error: "wallet required" });
  const user = await User.findOne({ wallet }).exec();
  res.json({ success: true, data: { wallet, credits: user ? user.credits : 0, preview: PREVIEW_LOCAL_PATH } });
});

router.get("/api/storage/preflight", async (req, res) => {
  try {
    const size = Number(req.query.size || 0);
    const retention = Number(req.query.ttl || ENV.STORAGE_DEFAULT_TTL_SECONDS);
    const walletRaw = (req.query.wallet as string) || (req.headers["x-wallet"] as string);
    const wallet = walletRaw ? walletRaw.toLowerCase() : "";
    if (!wallet) return res.status(400).json({ success: false, error: "wallet required" });

    const requiredCredits = computeUploadRequiredCredits(size, retention);
    const user = await User.findOne({ wallet }).exec();
    const available = user ? user.credits : 0;
    res.json({
      success: true,
      data: { canUpload: available >= requiredCredits, requiredCredits, availableCredits: available, preview: PREVIEW_LOCAL_PATH }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "server-error" });
  }
});

router.post("/api/storage/upload", multerUpload.single("file"), async (req, res) => {
  try {
    const walletRaw = (req.headers["x-wallet"] as string) || req.body.wallet;
    const wallet = walletRaw ? walletRaw.toLowerCase() : "";
    if (!wallet) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "wallet required in header x-wallet" });
    }
    if (!req.file) return res.status(400).json({ success: false, error: "file required" });

    const sizeBytes = req.file.size;
    const retention = Number(req.body.ttl || ENV.STORAGE_DEFAULT_TTL_SECONDS);
    const requiredCredits = computeUploadRequiredCredits(sizeBytes, retention);

    const user = await User.findOneAndUpdate({ wallet, credits: { $gte: requiredCredits } }, { $inc: { credits: -requiredCredits } }, { new: true }).exec();
    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(402).json({ success: false, error: "Insufficient credits" });
    }

    // optional: compute CID before upload
    const buffer = fs.readFileSync(req.file.path);
    try {
      const computedCid = await computeCIDForBuffer(buffer, req.file.originalname);
      console.log("Computed CID pre-upload:", computedCid);
    } catch (cidErr) {
      console.warn("CID computation failed - proceeding", cidErr);
    }

    const uploadResult = await uploadBufferToStoracha(buffer, req.file.originalname);
    const objectId = uploadResult.id || uploadResult.cid || uploadResult.carCid || uploadResult.objectId || null;

    await StoredObject.create({ owner: wallet, objectId, name: req.file.originalname, size: sizeBytes });

    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: { objectId, cid: uploadResult.cid || null, name: req.file.originalname, size: sizeBytes, preview: PREVIEW_LOCAL_PATH } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "upload-failed" });
  }
});

router.get("/api/storage/download/:objectId", async (req, res) => {
  try {
    const walletRaw = (req.headers["x-wallet"] as string) || "";
    const wallet = walletRaw ? walletRaw.toLowerCase() : "";
    if (!wallet) return res.status(400).json({ success: false, error: "wallet required in header x-wallet" });

    const objectId = req.params.objectId;
    const obj = await StoredObject.findOne({ objectId }).exec();
    if (!obj) return res.status(404).json({ success: false, error: "not found" });
    if (obj.owner !== wallet) return res.status(403).json({ success: false, error: "forbidden" });

    const { buffer, contentType } = await (await import("../services/StorachaClient")).fetchObjectFromStoracha?.(objectId) ?? { buffer: null, contentType: "application/octet-stream" };
    if (!buffer) return res.status(500).json({ success: false, error: "download-failed" });

    res.setHeader("Content-Type", contentType);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "download-failed" });
  }
});

router.post("/api/storage/delete", async (req, res) => {
  try {
    const walletRaw = (req.headers["x-wallet"] as string) || req.body.wallet;
    const wallet = walletRaw ? walletRaw.toLowerCase() : "";
    const { objectId } = req.body;
    if (!wallet || !objectId) return res.status(400).json({ success: false, error: "wallet & objectId required" });

    const obj = await StoredObject.findOne({ objectId }).exec();
    if (!obj) return res.status(404).json({ success: false, error: "not found" });
    if (obj.owner !== wallet) return res.status(403).json({ success: false, error: "forbidden" });

    await StoredObject.deleteOne({ objectId }).exec();
    // optionally call Storacha delete endpoint if available

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "delete-failed" });
  }
});

export default router;
