// hooks/useToken.tsx
"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { getContract as getTokenContract } from "@/lib/token";
import { formatUnits } from "viem";

/**
 * Client hook to interact with FST token & server utilities.
 * Requires wagmi v1 & viem integration (usePublicClient/useWalletClient).
 */
export function useToken() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient(); // optional; not used for current flows

  const [loading, setLoading] = useState(false);

  const checkAllowed = useCallback(
    async (required = 10) => {
      if (!address) throw new Error("no_address");
      setLoading(true);
      try {
        const res = await axios.post("/api/token/verify", { address, required });
        return res.data;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const getSignedUrl = useCallback(
    async (required = 10, filePath?: string) => {
      if (!address) throw new Error("no_address");
      setLoading(true);
      try {
        const res = await axios.post("/api/token/signed-url", { address, required, filePath });
        return res.data;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const adminMint = useCallback(async (to: string, amount: string, apiKey?: string) => {
    const res = await axios.post("/api/token/mint", { to, amount, apiKey });
    return res.data;
  }, []);

  const applyDiscount = useCallback(async () => {
    if (!address) throw new Error("no_address");
    setLoading(true);
    try {
      const res = await axios.post("/api/token/apply-discount", { address });
      return res.data;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const requestPriority = useCallback(async () => {
    if (!address) throw new Error("no_address");
    setLoading(true);
    try {
      const res = await axios.post("/api/token/request-priority", { address });
      return res.data;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const getOnchainBalance = useCallback(
    async (addr?: `0x${string}`) => {
      const a = (addr as `0x${string}`) || (address as `0x${string}`);
      if (!a) throw new Error("no_address");
      if (!publicClient) throw new Error("public_client_missing");
      const contract = getTokenContract(publicClient as any) as unknown as {
        read: {
          balanceOf: (args: [`0x${string}`]) => Promise<bigint>;
          decimals: () => Promise<bigint>;
        };
      };      
      const raw: bigint = await contract.read.balanceOf([a]);
      const decimals = Number(await contract.read.decimals().catch(() => BigInt(18)));
      const formatted = formatUnits(raw, decimals);
      return Number(formatted);
    },
    [address, publicClient]
  );

  return {
    address,
    isConnected,
    loading,
    walletClient,
    checkAllowed,
    getSignedUrl,
    adminMint,
    applyDiscount,
    requestPriority,
    getOnchainBalance,
  };
}
