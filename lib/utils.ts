import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Base Sepolia Configuration
export const CHAIN_CONFIG = {
  chainId: 84532,
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org"
} as const;

// Contract Addresses
export const CONTRACTS = {
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
  FST: "0xE86B2B54fee37c52df16757a2Cc24972e082c9Ec" as const,
} as const;

// Demo addresses for testing
export const DEMO_ADDRESSES = {
  recipient1: "0x48cc9C1Ba01412E47B3c8908FB03664B082B0611",
  recipient2: "0x620EF87B214ff02193135F30F824606E3D184Efc",
} as const;

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCurrency(amount: string | number, currency: string = 'USDC'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${num.toFixed(2)} ${currency}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTxHash(): string {
  return `0x${Math.random().toString(16).substring(2, 66)}`;
}