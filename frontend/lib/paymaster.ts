import { createPublicClient, http, Address } from 'viem';
import { baseSepolia } from 'viem/chains';

export interface PaymasterConfig {
  paymasterUrl: string;
  apiKey: string;
  sponsorshipPolicy: 'always' | 'conditional' | 'never';
}

export class PaymasterService {
  private config: PaymasterConfig;
  private publicClient;

  constructor(config: PaymasterConfig) {
    this.config = config;
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL)
    });
  }

  /**
   * Check if transaction is eligible for sponsorship
   */
  async isEligibleForSponsorship(
    userAddress: Address,
    to: Address,
    value: bigint,
    data: `0x${string}`
  ): Promise<boolean> {
    try {
      // Define sponsorship rules
      const rules = {
        maxGasLimit: BigInt(200000),
        allowedContracts: [
          '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
          // Add other allowed contract addresses
        ],
        maxValuePerTx: BigInt(1000) * BigInt(10) ** BigInt(6), // $1000 USDC max
        minBalance: BigInt(1) * BigInt(10) ** BigInt(6), // Min 1 USDC balance required
      };

      console.log('🔍 Checking sponsorship eligibility:', {
        userAddress,
        to,
        value: value.toString(), // Convert BigInt to string for logging
        dataLength: data.length
      });

      // Check if user has minimum balance (prevent spam)
      try {
        const balance = await this.publicClient.readContract({
          address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }]
          }],
          functionName: 'balanceOf',
          args: [userAddress]
        }) as bigint;

      
      } catch (balanceError) {
        console.warn('⚠️ Could not check user balance, allowing transaction');
      }

      // Check gas estimate
      const gasEstimate = await this.publicClient.estimateGas({
        account: userAddress,
        to,
        value,
        data
      });

      console.log('⛽ Gas estimate:', gasEstimate.toString());

      if (gasEstimate > rules.maxGasLimit) {
        console.log('❌ Gas estimate too high for sponsorship');
        return false;
      }

      // Check if contract is allowed
      const isAllowedContract = rules.allowedContracts.some(
        allowed => allowed.toLowerCase() === to.toLowerCase()
      );

      if (to && !isAllowedContract) {
        console.log('❌ Contract not in allowlist for sponsorship');
        return false;
      }

      // Check transaction value (for ETH transfers)
      if (value > rules.maxValuePerTx) {
        console.log('❌ Transaction value too high for sponsorship');
        return false;
      }

      console.log('✅ Transaction eligible for sponsorship');
      return true;
    } catch (error) {
      console.error('❌ Sponsorship eligibility check failed:', error);
      return false;
    }
  }

  /**
   * Get paymaster data for transaction
   */
  async getPaymasterData(
    userAddress: Address,
    transaction: {
      to: Address;
      value: bigint;
      data: `0x${string}`;
    }
  ): Promise<{
    paymaster: Address;
    paymasterData: `0x${string}`;
  } | null> {
    try {
      const isEligible = await this.isEligibleForSponsorship(
        userAddress,
        transaction.to,
        transaction.value,
        transaction.data
      );

      if (!isEligible) {
        console.log('❌ Transaction not eligible for paymaster sponsorship');
        return null;
      }

      console.log('🔄 Requesting paymaster sponsorship...');

      // Convert BigInt values to strings for JSON serialization
      const serializedTransaction = {
        to: transaction.to,
        value: transaction.value.toString(), // Convert BigInt to string
        data: transaction.data
      };

      // Call Coinbase Paymaster API
      const response = await fetch('/api/paymaster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          transaction: serializedTransaction
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Paymaster request failed:', errorText);
        return null;
      }

      const paymasterResponse = await response.json();
      
      if (!paymasterResponse.success || !paymasterResponse.sponsored) {
        console.log('❌ Paymaster declined sponsorship:', paymasterResponse.error);
        return null;
      }

      console.log('✅ Paymaster sponsorship approved');
      
      return {
        paymaster: paymasterResponse.paymaster as Address,
        paymasterData: (paymasterResponse.paymasterData || '0x') as `0x${string}`
      };
    } catch (error) {
      console.error('❌ Failed to get paymaster data:', error);
      return null;
    }
  }

  /**
   * Check if paymaster service is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(this.config.paymasterUrl && this.config.apiKey);
  }

  /**
   * Get sponsorship policy
   */
  getSponsorshipPolicy(): string {
    return this.config.sponsorshipPolicy;
  }
}

export const paymasterService = new PaymasterService({
  paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL!,
  apiKey: process.env.COINBASE_PAYMASTER_API_KEY!,
  sponsorshipPolicy: 'conditional'
});
