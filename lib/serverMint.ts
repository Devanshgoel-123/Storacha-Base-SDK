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
  const DEFAULT_DECIMALS = Number(process.env.TOKEN_DECIMALS ?? 18);

  if (!TOKEN_CONTRACT_ADDRESS) throw new Error("TOKEN_CONTRACT_ADDRESS not configured");
  if (!RPC_URL) throw new Error("RPC_URL not configured");

  const to = opts.to;
  const amountStr = opts.amount;
  const decimals = Number(opts.decimals ?? DEFAULT_DECIMALS);

  if (!ethers.utils.isAddress(to)) throw new Error("Invalid recipient address");
  if (Number.isNaN(Number(amountStr))) throw new Error("Invalid amount");

  const parsed = ethers.utils.parseUnits(amountStr, decimals);
  const wallet = getOwnerWallet(RPC_URL);

  const abi = [
    `function ${TOKEN_MINT_FUNCTION}(address to, uint256 amount) public`,
  ];
  const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, abi, wallet);

  const tx = await contract[TOKEN_MINT_FUNCTION](to, parsed);
  const receipt = await tx.wait(1);

  return { ok: true, type: "direct", txHash: tx.hash, receipt };
}
