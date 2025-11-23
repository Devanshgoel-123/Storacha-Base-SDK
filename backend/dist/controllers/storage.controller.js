"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const StoredObject_1 = __importDefault(require("../models/StoredObject"));
const User_1 = __importDefault(require("../models/User"));
const env_1 = require("../config/env");
const StorachaClient_1 = require("../services/StorachaClient");
const pricing_1 = require("../services/pricing");
const router = express_1.default.Router();
const uploadDir = env_1.ENV.UPLOAD_TEMP_DIR;
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const multerUpload = (0, multer_1.default)({ storage, limits: { fileSize: env_1.ENV.MAX_FILE_SIZE } });
router.get("/health", (_, res) => res.json({ success: true, uptime: process.uptime() }));
router.get("/api/storage/account", async (req, res) => {
    const walletRaw = req.query.wallet || req.headers["x-wallet"];
    const wallet = walletRaw ? walletRaw.toLowerCase() : "";
    if (!wallet)
        return res.status(400).json({ success: false, error: "wallet required" });
    const user = await User_1.default.findOne({ wallet }).exec();
    res.json({ success: true, data: { wallet, credits: user ? user.credits : 0, preview: StorachaClient_1.PREVIEW_LOCAL_PATH } });
});
router.get("/api/storage/preflight", async (req, res) => {
    try {
        const size = Number(req.query.size || 0);
        const retention = Number(req.query.ttl || env_1.ENV.STORAGE_DEFAULT_TTL_SECONDS);
        const walletRaw = req.query.wallet || req.headers["x-wallet"];
        const wallet = walletRaw ? walletRaw.toLowerCase() : "";
        if (!wallet)
            return res.status(400).json({ success: false, error: "wallet required" });
        const requiredCredits = (0, pricing_1.computeUploadRequiredCredits)(size, retention);
        const user = await User_1.default.findOne({ wallet }).exec();
        const available = user ? user.credits : 0;
        res.json({
            success: true,
            data: { canUpload: available >= requiredCredits, requiredCredits, availableCredits: available, preview: StorachaClient_1.PREVIEW_LOCAL_PATH }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "server-error" });
    }
});
router.post("/api/storage/upload", multerUpload.single("file"), async (req, res) => {
    try {
        const walletRaw = req.headers["x-wallet"] || req.body.wallet;
        const wallet = walletRaw ? walletRaw.toLowerCase() : "";
        if (!wallet) {
            if (req.file && fs_1.default.existsSync(req.file.path))
                fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, error: "wallet required in header x-wallet" });
        }
        if (!req.file)
            return res.status(400).json({ success: false, error: "file required" });
        const sizeBytes = req.file.size;
        const retention = Number(req.body.ttl || env_1.ENV.STORAGE_DEFAULT_TTL_SECONDS);
        const requiredCredits = (0, pricing_1.computeUploadRequiredCredits)(sizeBytes, retention);
        const user = await User_1.default.findOneAndUpdate({ wallet, credits: { $gte: requiredCredits } }, { $inc: { credits: -requiredCredits } }, { new: true }).exec();
        if (!user) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(402).json({ success: false, error: "Insufficient credits" });
        }
        // optional: compute CID before upload
        const buffer = fs_1.default.readFileSync(req.file.path);
        try {
            const computedCid = await (0, StorachaClient_1.computeCIDForBuffer)(buffer, req.file.originalname);
            console.log("Computed CID pre-upload:", computedCid);
        }
        catch (cidErr) {
            console.warn("CID computation failed - proceeding", cidErr);
        }
        const uploadResult = await (0, StorachaClient_1.uploadBufferToStoracha)(buffer, req.file.originalname);
        const objectId = uploadResult.id || uploadResult.cid || uploadResult.carCid || uploadResult.objectId || null;
        await StoredObject_1.default.create({ owner: wallet, objectId, name: req.file.originalname, size: sizeBytes });
        fs_1.default.unlinkSync(req.file.path);
        res.json({ success: true, data: { objectId, cid: uploadResult.cid || null, name: req.file.originalname, size: sizeBytes, preview: StorachaClient_1.PREVIEW_LOCAL_PATH } });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "upload-failed" });
    }
});
router.get("/api/storage/download/:objectId", async (req, res) => {
    try {
        const walletRaw = req.headers["x-wallet"] || "";
        const wallet = walletRaw ? walletRaw.toLowerCase() : "";
        if (!wallet)
            return res.status(400).json({ success: false, error: "wallet required in header x-wallet" });
        const objectId = req.params.objectId;
        const obj = await StoredObject_1.default.findOne({ objectId }).exec();
        if (!obj)
            return res.status(404).json({ success: false, error: "not found" });
        if (obj.owner !== wallet)
            return res.status(403).json({ success: false, error: "forbidden" });
        const { buffer, contentType } = await (await Promise.resolve().then(() => __importStar(require("../services/StorachaClient")))).fetchObjectFromStoracha?.(objectId) ?? { buffer: null, contentType: "application/octet-stream" };
        if (!buffer)
            return res.status(500).json({ success: false, error: "download-failed" });
        res.setHeader("Content-Type", contentType);
        res.send(buffer);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "download-failed" });
    }
});
router.post("/api/storage/delete", async (req, res) => {
    try {
        const walletRaw = req.headers["x-wallet"] || req.body.wallet;
        const wallet = walletRaw ? walletRaw.toLowerCase() : "";
        const { objectId } = req.body;
        if (!wallet || !objectId)
            return res.status(400).json({ success: false, error: "wallet & objectId required" });
        const obj = await StoredObject_1.default.findOne({ objectId }).exec();
        if (!obj)
            return res.status(404).json({ success: false, error: "not found" });
        if (obj.owner !== wallet)
            return res.status(403).json({ success: false, error: "forbidden" });
        await StoredObject_1.default.deleteOne({ objectId }).exec();
        // optionally call Storacha delete endpoint if available
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "delete-failed" });
    }
});
exports.default = router;
