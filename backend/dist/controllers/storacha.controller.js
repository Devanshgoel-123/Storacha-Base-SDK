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
exports.updateTransactionHash = exports.GetUserUploadHistory = exports.GetQuoteForFileUpload = exports.deposit = exports.uploadFiles = exports.uploadFile = exports.createUCANDelegation = void 0;
const StorachaClient_1 = require("../services/StorachaClient");
const Delegation = __importStar(require("@ucanto/core/delegation"));
const core_1 = require("@ucanto/core");
const schema_1 = require("@ucanto/core/schema");
const StoredObject_1 = __importDefault(require("../models/StoredObject"));
const pricing_1 = require("../services/pricing");
const payments_1 = require("../services/payments");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)();
/**
 * Create UCAN delegation that grants access to a particular file root within the current space.
 */
const createUCANDelegation = async (req, res) => {
    try {
        const { recipientDID, deadline, notBefore, baseCapabilities, fileCID } = req.body;
        if (!recipientDID || !baseCapabilities || !fileCID) {
            return res.status(400).json({ error: "recipientDID, baseCapabilities and fileCID required" });
        }
        const client = await (0, StorachaClient_1.initStorachaClient)();
        const spaceDID = client.agent.did();
        const audience = core_1.DID.parse(recipientDID);
        const agent = client.agent;
        const capabilities = baseCapabilities.map((can) => ({
            with: `${spaceDID}`,
            can,
            nb: { root: schema_1.Link.parse(fileCID) },
        }));
        const ucan = await Delegation.delegate({
            issuer: agent.issuer,
            audience,
            expiration: Number(deadline || 0),
            notBefore: Number(notBefore || 0),
            capabilities,
        });
        const archive = await ucan.archive();
        if (!archive.ok)
            throw new Error("Failed to create delegation archive");
        return res.status(200).json({
            message: "Delegation created successfully",
            delegation: Buffer.from(archive.ok).toString("base64"),
        });
    }
    catch (err) {
        console.error("Error creating UCAN delegation:", err);
        return res.status(500).json({ error: "Failed to create delegation" });
    }
};
exports.createUCANDelegation = createUCANDelegation;
/**
 * Upload a single file. Query param `cid` (precomputed) is required and validated.
 */
const uploadFile = async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ message: "No file uploaded" });
        const cidParam = req.query.cid || "";
        if (!cidParam)
            return res.status(400).json({ message: "CID is required" });
        // compute CID locally from buffer
        const computedCid = await (0, StorachaClient_1.computeCIDForBuffer)(file.buffer, file.originalname);
        if (computedCid !== cidParam) {
            return res.status(400).json({
                message: `CID mismatch! Precomputed: ${cidParam}, Computed: ${computedCid}`,
            });
        }
        // upload bytes via storacha adapter (client or REST fallback)
        const uploadResult = await (0, StorachaClient_1.uploadBufferToStoracha)(file.buffer, file.originalname);
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
            url: StorachaClient_1.PREVIEW_LOCAL_PATH,
            uploadedAt: new Date().toISOString(),
        };
        // Save minimal metadata in our DB
        await StoredObject_1.default.create({
            owner: (req.headers["x-wallet"] || "unknown").toLowerCase(),
            objectId: uploadedCID,
            name: file.originalname,
            size: file.size,
        });
        return res.status(200).json({
            message: "Upload successful",
            cid: uploadedCID,
            object: uploadObject,
            preview: StorachaClient_1.PREVIEW_LOCAL_PATH,
        });
    }
    catch (error) {
        console.error("Error uploading file to Storacha:", error);
        return res.status(500).json({ message: "Error uploading file", error: error?.message || error });
    }
};
exports.uploadFile = uploadFile;
/**
 * Upload multiple files as a directory. Query param `cid` (precomputed for directory) is required.
 */
const uploadFiles = async (req, res) => {
    try {
        const files = req.files || [];
        if (!files || files.length === 0)
            return res.status(400).json({ message: "No files uploaded" });
        const cidParam = req.query.cid || "";
        if (!cidParam)
            return res.status(400).json({ message: "CID is required" });
        // build a fileMap for directory CID computation
        const fileMap = {};
        for (const f of files)
            fileMap[f.originalname] = new Uint8Array(f.buffer);
        const computedDirCid = await (0, StorachaClient_1.computeCID)(fileMap);
        if (computedDirCid !== cidParam) {
            return res.status(400).json({
                message: `CID mismatch! Computed: ${computedDirCid}, Expected: ${cidParam}`,
            });
        }
        // upload each file (adapter handles client or REST fallback)
        const uploadedFiles = [];
        for (const f of files) {
            const result = await (0, StorachaClient_1.uploadBufferToStoracha)(f.buffer, f.originalname);
            const id = result?.id || result?.cid || result?.carCid || result || null;
            const idStr = id?.toString ? id.toString() : String(id);
            uploadedFiles.push({ filename: f.originalname, size: f.size, uploadedId: idStr });
            // save minimal metadata for each file (objectId set to directory CID for grouping)
            await StoredObject_1.default.create({
                owner: (req.headers["x-wallet"] || "unknown").toLowerCase(),
                objectId: computedDirCid,
                name: f.originalname,
                size: f.size,
            });
        }
        const uploadObject = {
            cid: computedDirCid,
            directoryName: `Upload-${Date.now()}`,
            url: StorachaClient_1.PREVIEW_LOCAL_PATH,
            size: files.reduce((s, f) => s + f.size, 0),
            files: uploadedFiles.map((u) => ({
                filename: u.filename,
                size: u.size,
                // using preview path for the directory as well per your instruction
                url: StorachaClient_1.PREVIEW_LOCAL_PATH,
            })),
            uploadedAt: new Date().toISOString(),
        };
        return res.status(200).json({
            message: "Upload successful",
            cid: computedDirCid,
            object: uploadObject,
            preview: StorachaClient_1.PREVIEW_LOCAL_PATH,
        });
    }
    catch (err) {
        console.error("Error uploading files:", err);
        return res.status(500).json({ message: "Error uploading files", error: err?.message || err });
    }
};
exports.uploadFiles = uploadFiles;
/**
 * Builds the deposit instruction for an upload transaction.
 * Produces the computed CID and a payments payload the client will sign.
 */
const deposit = async (req, res) => {
    try {
        const files = req.files || [];
        if (!files || files.length === 0)
            return res.status(400).json({ message: "No files selected" });
        const fileMap = {};
        let totalSize = 0;
        for (const file of files) {
            fileMap[file.originalname] = new Uint8Array(file.buffer);
            totalSize += file.size;
        }
        const { publicKey, duration, userEmail } = req.body;
        const durationInSeconds = parseInt(duration, 10);
        const DAY_TIME_IN_SECONDS = 86400;
        const duration_days = Math.floor(durationInSeconds / DAY_TIME_IN_SECONDS);
        const ratePerBytePerDay = 1000; // example unit (align with your pricing table)
        const amountInLamports = totalSize * duration_days * ratePerBytePerDay;
        const computedCID = await (0, StorachaClient_1.computeCID)(fileMap);
        if (!Number.isSafeInteger(amountInLamports) || amountInLamports <= 0) {
            throw new Error(`Invalid deposit amount calculated: ${amountInLamports}`);
        }
        // Build deposit tx payload for client to sign (token and amount must be provided by frontend/backend mapping)
        // Note: amountRaw must be provided in token raw units (e.g., USDC with 6 decimals). We return a payload with placeholders.
        const paymentsPayload = (0, payments_1.buildDepositTxData)(process.env.USDC_ADDRESS || "", 
        // returning a placeholder amountRaw here. Frontend should compute correct raw amount according to pricing.
        BigInt(0).toString(), "0", computedCID);
        // Persist a lightweight pending record for this CID (minimal model)
        await StoredObject_1.default.create({
            owner: (req.headers["x-wallet"] || "unknown").toLowerCase(),
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
            preview: StorachaClient_1.PREVIEW_LOCAL_PATH,
        });
    }
    catch (error) {
        console.error("Error creating deposit instruction:", error);
        return res.status(500).json({ message: "Error making a deposit", error: error?.message || error });
    }
};
exports.deposit = deposit;
/**
 * Returns a simple quote object. For now we map to computeUploadRequiredCredits.
 */
const GetQuoteForFileUpload = async (req, res) => {
    try {
        const duration = parseInt(req.query.duration || "0", 10);
        const size = parseInt(req.query.size || "0", 10);
        const requiredCredits = (0, pricing_1.computeUploadRequiredCredits)(size, duration);
        return res.status(200).json({ quoteObject: { requiredCredits }, success: true });
    }
    catch (err) {
        console.error("GetQuoteForFileUpload error:", err);
        return res.status(400).json({ quoteObject: null, success: false });
    }
};
exports.GetQuoteForFileUpload = GetQuoteForFileUpload;
/**
 * Returns user upload history (minimal model).
 */
const GetUserUploadHistory = async (req, res) => {
    try {
        const userAddress = (req.query.userAddress || "").toLowerCase();
        if (!userAddress)
            return res.status(400).json({ message: "Missing user address" });
        const files = await StoredObject_1.default.find({ owner: userAddress }).sort({ createdAt: -1 }).limit(100).lean().exec();
        return res.status(200).json({ userHistory: files, userAddress });
    }
    catch (err) {
        console.error("GetUserUploadHistory error:", err);
        return res.status(500).json({ message: "Error getting the user history" });
    }
};
exports.GetUserUploadHistory = GetUserUploadHistory;
/**
 * Optionally update a transaction hash associated with a CID.
 * Minimal model doesn't store transactionHash; extend model if you want to persist it.
 */
const updateTransactionHash = async (req, res) => {
    try {
        const { cid, transactionHash } = req.body;
        if (!cid || !transactionHash)
            return res.status(400).json({ message: "CID and transaction hash are required" });
        // If you want to persist txHash, extend StoredObject schema with transactionHash and update it here.
        // For now, return success to confirm endpoint contract.
        return res.status(200).json({ message: "Transaction hash accepted (not persisted in minimal model)" });
    }
    catch (err) {
        console.error("Error updating transaction hash:", err);
        return res.status(500).json({ message: "Error updating transaction hash" });
    }
};
exports.updateTransactionHash = updateTransactionHash;
