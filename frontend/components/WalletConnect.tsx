// components/WalletConnect.tsx
"use client";

import React from "react";
import { ConnectWallet, Wallet, useGetTokenBalance } from "@coinbase/onchainkit/wallet";
import { Identity, Avatar, Name, Address } from "@coinbase/onchainkit/identity";
import { useAccount, useBalance } from "wagmi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ExternalLink } from "lucide-react";
import { CONTRACTS, CHAIN_CONFIG, formatAddress } from "@/lib/utils";

/**
 * WalletConnect (customized)
 * - shows only USDC and FST token balances
 * - shows "Gas Free" badge and network info
 *
 * Note: uses both wagmi useBalance for token & onchainkit useGetTokenBalance for FST if you prefer it.
 * I'm using both patterns safely — change to your preferred hook if needed.
 */

export default function WalletConnect() {
  const { address, isConnected, connector } = useAccount();


  const short = (addr?: string) =>
    addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";


  return (
    <Card className="flex justify-center gap-2 p-4 mb-6">
      {/* Wallet header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 border rounded-full px-3 py-1 bg-slate-50">
            {isConnected ? (
              <>
                <span className="text-sm text-slate-700 font-medium">
                  {short(address)}
                </span>
              </>
            ) : (
              <ConnectWallet />
            )}
          </div>
        </div>

      
      </div>

      {/* Connected details */}
      {isConnected && address && (
        <div className="mt-4 space-y-3">
          {/* Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 inline-flex items-center gap-2">
                <Zap className="w-3 h-3" />
                Gas Free
              </Badge>

              <Badge variant="outline" className="text-xs">
                {CHAIN_CONFIG.name}
              </Badge>
            </div>

            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <a
                href={CHAIN_CONFIG.blockExplorer}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Explorer
              </a>
            </div>
          </div>

        
          {/* Small footer */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>Connected to {CHAIN_CONFIG.name}</div>
            <div className="text-green-600 inline-flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Gasless enabled
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
