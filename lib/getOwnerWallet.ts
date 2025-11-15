// lib/getOwnerWallet.ts
import { ethers } from "ethers";

/**
 * getOwnerWallet(rpcUrl?)
 * - Reads OWNER_PRIVATE_KEY from env
 * - Returns ethers.Wallet connected to RPC
 */
export function getOwnerWallet(rpcUrl?: string) {
  const RPC = rpcUrl ?? process.env.RPC_URL;
  const PK = process.env.OWNER_PRIVATE_KEY;
  if (!RPC) throw new Error("RPC_URL not configured");
  if (!PK) throw new Error("OWNER_PRIVATE_KEY not configured");
  const provider = new ethers.JsonRpcProvider(RPC);
  return new ethers.Wallet(PK, provider);
}
