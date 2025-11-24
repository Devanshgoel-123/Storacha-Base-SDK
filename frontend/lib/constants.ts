import { base } from '@base-org/account';
import type { Address } from 'viem';

// Base Sepolia Configuration
export const BASE_SEPOLIA_CHAIN_ID = base.constants.CHAIN_IDS.baseSepolia; // 84532
export const BASE_MAINNET_CHAIN_ID = base.constants.CHAIN_IDS.base; // 8453

// USDC Contract on Base Sepolia
export const USDC_CONTRACT_ADDRESS: Address = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Demo recipient addresses
export const DEMO_ADDRESSES = {
  recipient1: '0x671B44D779B676f960F7375DCAdb84B4f330CF5D' as Address,
  recipient2: '0x123abc456789def012345678901234567890abcde' as Address,
};

// ERC20 ABI for USDC transfers
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
] as const;

// Utility functions
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCurrency(amount: string | number, currency: string = 'USDC'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${num.toFixed(2)} ${currency}`;
}

export function chainIdToHex(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}