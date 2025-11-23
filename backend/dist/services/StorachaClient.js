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
exports.PREVIEW_LOCAL_PATH = void 0;
exports.initStorachaClient = initStorachaClient;
exports.computeCID = computeCID;
exports.uploadBufferToStoracha = uploadBufferToStoracha;
exports.computeCIDForBuffer = computeCIDForBuffer;
const client_1 = require("@storacha/client");
const ed25519_1 = require("@storacha/client/dist/principal/ed25519");
const Proof = __importStar(require("@storacha/client/dist/proof"));
const memory_1 = require("@storacha/client/dist/stores/memory");
const ipfs_car_1 = require("ipfs-car");
const node_fetch_1 = __importDefault(require("node-fetch"));
const env_1 = require("../config/env");
async function initStorachaClient() {
    const principal = ed25519_1.Signer.parse(env_1.ENV.STORACHA_KEY);
    const store = new memory_1.StoreMemory();
    const client = await (0, client_1.create)({ principal, store });
    const proof = await Proof.parse(env_1.ENV.STORACHA_PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());
    return client;
}
async function computeCID(fileMap) {
    try {
        if (Object.keys(fileMap).length === 1) {
            const [_, content] = Object.entries(fileMap)[0];
            const file = new Blob([content]);
            let rootCID;
            await (0, ipfs_car_1.createFileEncoderStream)(file)
                .pipeThrough(new TransformStream({
                transform(block, controller) {
                    rootCID = block.cid;
                    controller.enqueue(block);
                }
            }))
                .pipeThrough(new ipfs_car_1.CAREncoderStream())
                .pipeTo(new WritableStream());
            return rootCID.toString();
        }
        // directory case
        return await computeDirectoryCID(fileMap);
    }
    catch (err) {
        console.error("computeCID error", err);
        throw err;
    }
}
async function computeDirectoryCID(fileMap) {
    const files = Object.entries(fileMap).map(([name, content]) => ({
        name,
        stream: () => new ReadableStream({
            start(controller) {
                controller.enqueue(content);
                controller.close();
            }
        })
    }));
    let rootCID;
    await (0, ipfs_car_1.createDirectoryEncoderStream)(files)
        .pipeThrough(new TransformStream({
        transform(block, controller) {
            rootCID = block.cid;
            controller.enqueue(block);
        }
    }))
        .pipeThrough(new ipfs_car_1.CAREncoderStream())
        .pipeTo(new WritableStream());
    return rootCID.toString();
}
async function uploadBufferToStoracha(buffer, filename = "upload.bin") {
    // fallback REST if no storacha key/proof is provided
    if (!env_1.ENV.STORACHA_KEY || !env_1.ENV.STORACHA_PROOF) {
        const res = await (0, node_fetch_1.default)(`${env_1.ENV.STORACHA_BASE_URL}/mcp/v0/objects`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env_1.ENV.STORACHA_SERVICE_KEY}`,
                "Content-Type": "application/octet-stream",
                "X-Filename": filename
            },
            body: buffer
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Storacha REST upload failed: ${txt}`);
        }
        return res.json();
    }
    const client = await initStorachaClient();
    const fileObj = { name: filename, data: buffer };
    let result;
    if (typeof client.put === "function") {
        result = await client.put([fileObj]);
    }
    else if (typeof client.uploadFile === "function") {
        // some SDKs expose uploadFile for single file
        result = await client.uploadFile(fileObj);
    }
    else if (typeof client.addFiles === "function") {
        result = await client.addFiles([fileObj]);
    }
    else {
        // fallback REST
        const res = await (0, node_fetch_1.default)(`${env_1.ENV.STORACHA_BASE_URL}/mcp/v0/objects`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env_1.ENV.STORACHA_SERVICE_KEY}`,
                "Content-Type": "application/octet-stream",
                "X-Filename": filename
            },
            body: buffer
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Storacha REST upload failed: ${txt}`);
        }
        result = await res.json();
    }
    return result;
}
async function computeCIDForBuffer(buffer, filename = "file") {
    const arr = new Uint8Array(buffer);
    const fileMap = { [filename]: arr };
    return await computeCID(fileMap);
}
exports.PREVIEW_LOCAL_PATH = env_1.ENV.PREVIEW_LOCAL_PATH;
