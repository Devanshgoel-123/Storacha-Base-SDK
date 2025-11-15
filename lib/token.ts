// lib/token.ts
import { ethers } from "ethers";

const RPC = process.env.RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL;
export const TOKEN_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || "0xe86b2b54fee37c52df16757a2cc24972e082c9ec";
export const DEFAULT_DECIMALS = Number(process.env.TOKEN_DECIMALS || 18);

// ABI you provided (trimmed to necessary items)
export const TOKEN_ABI = [
  { "inputs":[{"internalType":"uint256","name":"initialSupply","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event" },
  { "anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event" },
  { "inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function" },
  { "inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" },
  { "inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function" }
];

function getProvider() {
  if (!RPC) throw new Error("RPC URL not configured. Set NEXT_PUBLIC_BASE_RPC_URL or RPC_URL.");
  return new ethers.JsonRpcProvider(RPC);
}

export function getContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const providerOrSigner = signerOrProvider ?? getProvider();
  return new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, providerOrSigner);
}

export async function fetchDecimals(): Promise<number> {
  try {
    const token = getContract();
    const d: number = await token.decimals();
    return Number(d ?? DEFAULT_DECIMALS);
  } catch (err) {
    return DEFAULT_DECIMALS;
  }
}

export async function fetchBalance(address: string): Promise<string> {
  if (!ethers.isAddress(address)) throw new Error("invalid_address");
  const token = getContract();
  const raw: bigint = await token.balanceOf(address);
  const decimals = await fetchDecimals();
  return ethers.formatUnits(raw, decimals);
}

export function parseUnits(amount: string | number, decimals = DEFAULT_DECIMALS) {
  return ethers.parseUnits(String(amount), decimals);
}

export function formatUnits(raw: ethers.BigNumberish, decimals = DEFAULT_DECIMALS) {
  return ethers.formatUnits(raw, decimals);
}
