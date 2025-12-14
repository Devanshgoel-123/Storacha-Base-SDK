// src/services/storachaClient.ts
import { create } from "@storacha/client";
import { Signer } from "@storacha/client/dist/principal/ed25519";
import * as Proof from "@storacha/client/dist/proof";
import { StoreMemory } from "@storacha/client/dist/stores/memory";
import {
  createFileEncoderStream,
  CAREncoderStream,
  createDirectoryEncoderStream
} from "ipfs-car";
import fetch from "node-fetch";
import { ENV } from "../config/env";

export async function initStorachaClient(): Promise<any> {
  const principal = Signer.parse(ENV.STORACHA_KEY);
  const store = new StoreMemory();
  const client = await create({ principal, store });

  const proof = await Proof.parse(ENV.STORACHA_PROOF);
  const space = await client.addSpace(proof);

  await client.setCurrentSpace(space.did());

  return client;
}

export async function computeCID(fileMap: Record<string, Uint8Array>): Promise<string> {
  try {
    if (Object.keys(fileMap).length === 1) {
      const [_, content] = Object.entries(fileMap)[0];
      const safeUint8 = Uint8Array.from(content);
      const file = new Blob([safeUint8]);
      let rootCID: any;

      await createFileEncoderStream(file)
        .pipeThrough(new TransformStream({
          transform(block, controller) {
            rootCID = (block as any).cid;
            controller.enqueue(block);
          }
        }))
        .pipeThrough(new CAREncoderStream())
        .pipeTo(new WritableStream());

      return rootCID.toString();
    }
    // directory case
    return await computeDirectoryCID(fileMap);
  } catch (err) {
    console.error("computeCID error", err);
    throw err;
  }
}

async function computeDirectoryCID(fileMap: Record<string, Uint8Array>): Promise<string> {
  const files = Object.entries(fileMap).map(([name, content]) => ({
    name,
    stream: () => new ReadableStream({
      start(controller) {
        controller.enqueue(content);
        controller.close();
      }
    })
  }));

  let rootCID: any;
  await createDirectoryEncoderStream(files)
    .pipeThrough(new TransformStream({
      transform(block, controller) {
        rootCID = (block as any).cid;
        controller.enqueue(block);
      }
    }))
    .pipeThrough(new CAREncoderStream())
    .pipeTo(new WritableStream());

  return rootCID.toString();
}

export async function uploadBufferToStoracha(buffer: Buffer, filename = "upload.bin") {
  // fallback REST if no storacha key/proof is provided
  if (!ENV.STORACHA_KEY || !ENV.STORACHA_PROOF) {
    const res = await fetch(`${ENV.STORACHA_BASE_URL}/mcp/v0/objects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.STORACHA_SERVICE_KEY}`,
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

  const fileObj = { name: filename, data: buffer } as any;
  let result: any;

  if (typeof (client as any).put === "function") {
    result = await (client as any).put([fileObj]);
  } else if (typeof (client as any).uploadFile === "function") {
    // some SDKs expose uploadFile for single file
    result = await (client as any).uploadFile(fileObj);
  } else if (typeof (client as any).addFiles === "function") {
    result = await (client as any).addFiles([fileObj]);
  } else {
    // fallback REST
    const res = await fetch(`${ENV.STORACHA_BASE_URL}/mcp/v0/objects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.STORACHA_SERVICE_KEY}`,
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

export async function computeCIDForBuffer(buffer: Buffer, filename = "file") {
  const arr = new Uint8Array(buffer);
  const fileMap: Record<string, Uint8Array> = { [filename]: arr };
  return await computeCID(fileMap);
}

export const PREVIEW_LOCAL_PATH = ENV.PREVIEW_LOCAL_PATH;
