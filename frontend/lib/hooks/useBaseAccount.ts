'use client';
import { useEffect, useState } from 'react';
import { createBaseAccountSDK, getCryptoKeyAccount } from '@base-org/account';
import { useAccount } from 'wagmi';
import { BASE_SEPOLIA_CHAIN_ID } from '@/lib/constants';

export function useBaseAccount() {
  const [provider, setProvider] = useState<any | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { isConnected } = useAccount();

  useEffect(() => {
    async function initializeBaseAccount() {
      if (!isConnected) {
        setProvider(null);
        setAddress(null);
        setIsInitialized(false);
        return;
      }

      try {
        console.log('🔄 Initializing Base Account SDK...');
        
        // Initialize Base Account SDK - exactly as in official docs
        const sdk = createBaseAccountSDK({
          appName: 'FlowSend',
          appLogoUrl: 'https://flowsend.app/logo.png',
          appChainIds: [BASE_SEPOLIA_CHAIN_ID],
        });

        const baseProvider = sdk.getProvider();
        console.log('📦 Base Account SDK created:', sdk.subAccount);
        setProvider(baseProvider);
        console.log('✅ Base Account provider initialized');

        // Get the user's account - exactly as in official docs
        const accounts = await baseProvider.request({
          method: 'eth_requestAccounts',
        }) as string[]; // Type assertion to specify accounts as an array of strings
        console.log('📱 Crypto account response:', accounts);
        
        // Extract address from account - exactly as in official docs
        const fromAddress = accounts[0];
        
        console.log('📍 Extracted address:', fromAddress);
        
        if (!fromAddress) {
          console.error('❌ No address found in crypto account');
          throw new Error('No account found - address not available in cryptoAccount.account.address');
        }

        setAddress(fromAddress);
        setIsInitialized(true);
        console.log('✅ Base Account initialized with address:', fromAddress);

      } catch (err) {
        console.error('❌ Failed to initialize Base Account:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setIsInitialized(false);
      }
    }

    initializeBaseAccount();
  }, [isConnected]);

  return {
    provider,
    address, // This should be cryptoAccount?.account?.address
    isInitialized,
    error,
  };
}
