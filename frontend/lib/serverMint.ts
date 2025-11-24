// lib/serverMint.ts
import { ethers } from "ethers";
import { getOwnerWallet } from "./getOwnerWallet";

/**
 * mintTokenDirect - direct owner-signer mint
 * - to: string
 * - amount: string
 * - decimals?: number|string
 */
export async function mintTokenDirect(opts: {
  to: string;
  amount: string;
  decimals?: number | string;
}) {
  const RPC_URL = process.env.RPC_URL;
  const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS;
  const TOKEN_MINT_FUNCTION = process.env.TOKEN_MINT_FUNCTION ?? "mint";

  if (!TOKEN_CONTRACT_ADDRESS) throw new Error("TOKEN_CONTRACT_ADDRESS not configured");
  if (!RPC_URL) throw new Error("RPC_URL not configured");

  const to = opts.to;
  const amountStr = opts.amount;

  if (!ethers.isAddress(to)) throw new Error("Invalid recipient address");
  if (Number.isNaN(Number(amountStr))) throw new Error("Invalid amount");

  const wallet = getOwnerWallet(RPC_URL);
  console.log(`Minting ${amountStr} tokens to ${to} via ${TOKEN_MINT_FUNCTION} on ${TOKEN_CONTRACT_ADDRESS}`);

  const abi = [
    `function ${TOKEN_MINT_FUNCTION}(address to, uint256 amount) public`,
  ];
  const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, abi, wallet);

  const tx = await contract[TOKEN_MINT_FUNCTION](to, amountStr);
  const receipt = await tx.wait(1);

  return { ok: true, type: "direct", txHash: tx.hash, receipt };
}
