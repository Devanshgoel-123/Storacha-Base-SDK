// src/controllers/storacha.controller.ts
import { Request, Response } from "express";
import {
  initStorachaClient,
  computeCID,
  computeCIDForBuffer,
  uploadBufferToStoracha,
  PREVIEW_LOCAL_PATH,
} from "../services/StorachaClient";
import * as Delegation from "@ucanto/core/delegation";
import { DID } from "@ucanto/core";
import { Link } from "@ucanto/core/schema";
import User from "../models/User";
import StoredObject from "../models/StoredObject";
import { computeUploadRequiredCredits } from "../services/pricing";
import { buildDepositTxData } from "../services/payments";

import multer from "multer";
const upload = multer();

/**
 * Create UCAN delegation that grants access to a particular file root within the current space.
 */
export const createUCANDelegation = async (req: Request, res: Response) => {
  try {
    const { recipientDID, deadline, notBefore, baseCapabilities, fileCID } = req.body;
    if (!recipientDID || !baseCapabilities || !fileCID) {
      return res.status(400).json({ error: "recipientDID, baseCapabilities and fileCID required" });
    }

    const client = await initStorachaClient();
    const spaceDID = client.agent.did();
    const audience = DID.parse(recipientDID);
    const agent = client.agent;

    const capabilities = baseCapabilities.map((can: string) => ({
      with: `${spaceDID}`,
      can,
      nb: { root: Link.parse(fileCID) },
    }));

    const ucan = await Delegation.delegate({
      issuer: agent.issuer,
      audience,
      expiration: Number(deadline || 0),
      notBefore: Number(notBefore || 0),
      capabilities,
    });

    const archive = await ucan.archive();
    if (!archive.ok) throw new Error("Failed to create delegation archive");

    return res.status(200).json({
      message: "Delegation created successfully",
      delegation: Buffer.from(archive.ok).toString("base64"),
    });
  } catch (err) {
    console.error("Error creating UCAN delegation:", err);
    return res.status(500).json({ error: "Failed to create delegation" });
  }
};

/**
 * Upload a single file. Query param `cid` (precomputed) is required and validated.
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const cidParam = (req.query.cid as string) || "";
    if (!cidParam) return res.status(400).json({ message: "CID is required" });

    // compute CID locally from buffer
    const computedCid = await computeCIDForBuffer(file.buffer, file.originalname);
    if (computedCid !== cidParam) {
      return res.status(400).json({
        message: `CID mismatch! Precomputed: ${cidParam}, Computed: ${computedCid}`,
      });
    }

    // upload bytes via storacha adapter (client or REST fallback)
    const uploadResult = await uploadBufferToStoracha(file.buffer, file.originalname);
    const uploadedId = uploadResult?.id || uploadResult?.cid || uploadResult?.carCid || uploadResult || null;
    const uploadedCID = uploadedId?.toString ? uploadedId.toString() : String(uploadedId);

    if (uploadedCID !== cidParam) {
      // still allow the upload but warn — mismatch may indicate different packing
      console.warn(`Uploaded CID (${uploadedCID}) differs from precomputed (${cidParam})`);
    }

    const uploadObject = {
      cid: uploadedCID,
      filename: file.originalname,
      size: file.size,
      type: file.mimetype,
      // per your instruction: return the local preview path exactly; frontend will transform it.
      url: PREVIEW_LOCAL_PATH,
      uploadedAt: new Date().toISOString(),
    };

    // Save minimal metadata in our DB
    await StoredObject.create({
      owner: ((req.headers["x-wallet"] as string) || "unknown").toLowerCase(),
      objectId: uploadedCID,
      name: file.originalname,
      size: file.size,
    });

    return res.status(200).json({
      message: "Upload successful",
      cid: uploadedCID,
      object: uploadObject,
      preview: PREVIEW_LOCAL_PATH,
    });
  } catch (error) {
    console.error("Error uploading file to Storacha:", error);
    return res.status(500).json({ message: "Error uploading file", error: (error as any)?.message || error });
  }
};

/**
 * Upload multiple files as a directory. Query param `cid` (precomputed for directory) is required.
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files || files.length === 0) return res.status(400).json({ message: "No files uploaded" });

    const cidParam = (req.query.cid as string) || "";
    if (!cidParam) return res.status(400).json({ message: "CID is required" });

    // build a fileMap for directory CID computation
    const fileMap: Record<string, Uint8Array> = {};
    for (const f of files) fileMap[f.originalname] = new Uint8Array(f.buffer);

    const computedDirCid = await computeCID(fileMap);
    if (computedDirCid !== cidParam) {
      return res.status(400).json({
        message: `CID mismatch! Computed: ${computedDirCid}, Expected: ${cidParam}`,
      });
    }

    // upload each file (adapter handles client or REST fallback)
    const uploadedFiles: Array<{ filename: string; size: number; uploadedId: string }> = [];
    for (const f of files) {
      const result = await uploadBufferToStoracha(f.buffer, f.originalname);
      const id = result?.id || result?.cid || result?.carCid || result || null;
      const idStr = id?.toString ? id.toString() : String(id);
      uploadedFiles.push({ filename: f.originalname, size: f.size, uploadedId: idStr });

      // save minimal metadata for each file (objectId set to directory CID for grouping)
      await StoredObject.create({
        owner: ((req.headers["x-wallet"] as string) || "unknown").toLowerCase(),
        objectId: computedDirCid,
        name: f.originalname,
        size: f.size,
      });
    }

    const uploadObject = {
      cid: computedDirCid,
      directoryName: `Upload-${Date.now()}`,
      url: PREVIEW_LOCAL_PATH,
      size: files.reduce((s, f) => s + f.size, 0),
      files: uploadedFiles.map((u) => ({
        filename: u.filename,
        size: u.size,
        // using preview path for the directory as well per your instruction
        url: PREVIEW_LOCAL_PATH,
      })),
      uploadedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      message: "Upload successful",
      cid: computedDirCid,
      object: uploadObject,
      preview: PREVIEW_LOCAL_PATH,
    });
  } catch (err) {
    console.error("Error uploading files:", err);
    return res.status(500).json({ message: "Error uploading files", error: (err as any)?.message || err });
  }
};

/**
 * Builds the deposit instruction for an upload transaction.
 * Produces the computed CID and a payments payload the client will sign.
 */
export const deposit = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files || files.length === 0) return res.status(400).json({ message: "No files selected" });

    const fileMap: Record<string, Uint8Array> = {};
    let totalSize = 0;
    for (const file of files) {
      fileMap[file.originalname] = new Uint8Array(file.buffer);
      totalSize += file.size;
    }

    const { publicKey, duration, userEmail } = req.body;
    const durationInSeconds = parseInt(duration as string, 10);
    const DAY_TIME_IN_SECONDS = 86400;
    const duration_days = Math.floor(durationInSeconds / DAY_TIME_IN_SECONDS);
    const ratePerBytePerDay = 1000; // example unit (align with your pricing table)
    const amountInLamports = totalSize * duration_days * ratePerBytePerDay;

    const computedCID = await computeCID(fileMap);

    if (!Number.isSafeInteger(amountInLamports) || amountInLamports <= 0) {
      throw new Error(`Invalid deposit amount calculated: ${amountInLamports}`);
    }

    // Build deposit tx payload for client to sign (token and amount must be provided by frontend/backend mapping)
    // Note: amountRaw must be provided in token raw units (e.g., USDC with 6 decimals). We return a payload with placeholders.
    const paymentsPayload = buildDepositTxData(
      process.env.USDC_ADDRESS || "",
      // returning a placeholder amountRaw here. Frontend should compute correct raw amount according to pricing.
      BigInt(0).toString(),
      "0",
      computedCID
    );

    // Persist a lightweight pending record for this CID (minimal model)
    await StoredObject.create({
      owner: ((req.headers["x-wallet"] as string) || "unknown").toLowerCase(),
      objectId: computedCID,
      name: files.length === 1 ? files[0].originalname : `directory-${Date.now()}`,
      size: totalSize,
    });

    return res.status(200).json({
      message: "Deposit instruction ready — sign to finalize upload",
      cid: computedCID,
      instructions: paymentsPayload,
      fileCount: files.length,
      totalSize,
      files: files.map((f) => ({ name: f.originalname, size: f.size, type: f.mimetype })),
      preview: PREVIEW_LOCAL_PATH,
    });
  } catch (error) {
    console.error("Error creating deposit instruction:", error);
    return res.status(500).json({ message: "Error making a deposit", error: (error as any)?.message || error });
  }
};

/**
 * Returns a simple quote object. For now we map to computeUploadRequiredCredits.
 */
export const GetQuoteForFileUpload = async (req: Request, res: Response) => {
  try {
    const duration = parseInt((req.query.duration as string) || "0", 10);
    const size = parseInt((req.query.size as string) || "0", 10);
    const requiredCredits = computeUploadRequiredCredits(size, duration);
    return res.status(200).json({ quoteObject: { requiredCredits }, success: true });
  } catch (err) {
    console.error("GetQuoteForFileUpload error:", err);
    return res.status(400).json({ quoteObject: null, success: false });
  }
};

/**
 * Returns user upload history (minimal model).
 */
export const GetUserUploadHistory = async (req: Request, res: Response) => {
  try {
    const userAddress = ((req.query.userAddress as string) || "").toLowerCase();
    if (!userAddress) return res.status(400).json({ message: "Missing user address" });

    const files = await StoredObject.find({ owner: userAddress }).sort({ createdAt: -1 }).limit(100).lean().exec();
    return res.status(200).json({ userHistory: files, userAddress });
  } catch (err) {
    console.error("GetUserUploadHistory error:", err);
    return res.status(500).json({ message: "Error getting the user history" });
  }
};

/**
 * Optionally update a transaction hash associated with a CID.
 * Minimal model doesn't store transactionHash; extend model if you want to persist it.
 */
export const updateTransactionHash = async (req: Request, res: Response) => {
  try {
    const { cid, transactionHash } = req.body;
    if (!cid || !transactionHash) return res.status(400).json({ message: "CID and transaction hash are required" });

    // If you want to persist txHash, extend StoredObject schema with transactionHash and update it here.
    // For now, return success to confirm endpoint contract.
    return res.status(200).json({ message: "Transaction hash accepted (not persisted in minimal model)" });
  } catch (err) {
    console.error("Error updating transaction hash:", err);
    return res.status(500).json({ message: "Error updating transaction hash" });
  }
};


