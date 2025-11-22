'use client';
import { useEffect, useState } from 'react';
import type { ProviderInterface } from '@base-org/account';
import { BASE_SEPOLIA_CHAIN_ID } from '@/lib/constants';

export function usePaymasterCapabilities(
  provider: ProviderInterface | null,
  address: string | null,
  isInitialized: boolean
) {
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkCapabilities() {
      // Wait for provider to be initialized and address to be available
      if (!provider || !address || !isInitialized) {
        setIsSupported(false);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      setError(null);

      try {
        console.log('🔍 Checking paymaster capabilities for:', address);

        // Ensure we have account access first
        try {
          await provider.request({
            method: 'eth_requestAccounts',
            params: []
          });
        } catch (requestError) {
          console.warn('eth_requestAccounts already called or not needed');
        }

        // Small delay to ensure wallet is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get wallet capabilities
        const capabilities = await provider.request({
          method: 'wallet_getCapabilities',
          params: [address]
        });

        console.log('📋 Wallet capabilities:', capabilities);

        // Check if Base Sepolia supports paymaster
        const chainIdDecimal = BASE_SEPOLIA_CHAIN_ID; // 84532
        const chainIdHex = `0x${chainIdDecimal.toString(16)}`; // 0x14a34

        console.log('🔍 Looking for chain capabilities:', {
          decimal: chainIdDecimal,
          hex: chainIdHex
        });

        // Define the type for capabilities to allow indexing
        type CapabilitiesType = {
          [key: string]: {
            paymasterService?: {
              supported?: boolean;
            };
          };
        };

        const baseCapabilities = (capabilities as CapabilitiesType)?.[chainIdDecimal] || 
                              (capabilities as CapabilitiesType)?.[chainIdHex] ||
                              (capabilities as CapabilitiesType)?.[chainIdHex.toLowerCase()];
        const supported = baseCapabilities?.paymasterService?.supported === true;
        
        console.log('Paymaster support status:', {
          chainId: BASE_SEPOLIA_CHAIN_ID,
          supported,
          paymasterService: baseCapabilities?.paymasterService
        });

        setIsSupported(supported);
        
        if (!supported) {
          setError('Paymaster service not supported by this wallet');
        }
      } catch (err) {
        console.error('❌ Failed to check paymaster capabilities:', err);
        setIsSupported(false);
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to check capabilities';
        setError(errorMessage);
        
        // If it's the eth_requestAccounts error, provide helpful message
        if (errorMessage.includes('eth_requestAccounts')) {
          setError('Please ensure your wallet is properly connected');
        }
      } finally {
        setIsChecking(false);
      }
    }

    checkCapabilities();
  }, [provider, address, isInitialized]);

  return {
    isSupported,
    isChecking,
    error,
  };
}
