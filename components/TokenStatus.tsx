// components/TokenStatus.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useToken } from "@/lib/hooks/useToken";
import axios from "axios";
import { Button } from "@/components/ui/button";

export default function TokenStatus({ required = 10 }: { required?: number }) {
  const { address, isConnected, checkAllowed, getOnchainBalance } = useToken();
  const [balance, setBalance] = useState<number | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;
    setLoading(true);
    checkAllowed(required).then((r: any) => {
      setBalance(r.balance ?? null);
      setAllowed(Boolean(r.allowed));
    }).catch(console.error).finally(() => setLoading(false));
  }, [address, isConnected, checkAllowed, required]);

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold">FlowSend Token Status</h3>
      {!isConnected && <div className="text-sm">Connect wallet to see your token status.</div>}
      {isConnected && (
        <>
          <div className="mt-2">Address: <code className="text-xs">{address}</code></div>
          <div>Balance: <strong>{loading ? "Checking…" : (balance ?? "—")}</strong></div>
          <div className="mt-2">
            <Button disabled={!allowed} onClick={() => window.alert("Feature unlocked!")}>{allowed ? "Unlocked" : "Locked"}</Button>
            <Button variant="outline" onClick={() => alert("Go to buy/mint flow")}>Get Tokens</Button>
          </div>
        </>
      )}
    </div>
  );
}
