// components/TokenGate.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useToken } from "@/lib/hooks/useToken";
import { Button } from "@/components/ui/button";

export default function TokenGate({ required = 10, filePath = "/assets/flowsend_ppt_token_gated.pptx" }: { required?: number; filePath?: string }) {
  const { address, isConnected, checkAllowed, getSignedUrl, loading } = useToken();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setAllowed(null);
      setBalance(null);
      return;
    }
    setError(null);
    checkAllowed(required)
      .then((r: any) => {
        if (!r.ok) setError(r.error || "verify_failed");
        else {
          setAllowed(Boolean(r.allowed));
          setBalance(r.balance ?? null);
        }
      })
      .catch((e) => setError(String(e)));
  }, [address, isConnected, checkAllowed, required]);

  async function handleDownload() {
    try {
      const res = await getSignedUrl(required, filePath);
      if (!res.ok) {
        alert("Access denied: " + (res.error || "unknown"));
        return;
      }
      window.open(res.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Failed to get file");
    }
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Token-gated PPT</h3>
      {!isConnected && <div className="text-sm text-muted-foreground">Connect wallet to check access.</div>}
      {isConnected && (
        <>
          <div className="mb-2">Required: <strong>{required}</strong> • Your balance: <strong>{loading ? "checking..." : (balance ?? "—")}</strong></div>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <div className="flex gap-2">
            <Button onClick={handleDownload} disabled={!allowed || loading}>{loading ? "Checking…" : (allowed ? "Download PPT" : "Locked")}</Button>
            {!allowed && <Button variant="outline" onClick={() => alert("Get tokens via faucet or mint (dev)")} >Get Tokens</Button>}
          </div>
        </>
      )}
    </div>
  );
}
