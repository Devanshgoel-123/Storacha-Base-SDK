// components/TokenPanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useToken } from "@/lib/hooks/useToken";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Props:
 *  - required: number of FST required to unlock (default 10)
 *  - filePath: path of gated ppt (for signed-url endpoint)
 */
export default function TokenPanel({ required = 10, filePath = "/assets/flowsend_ppt_token_gated.pptx" }: { required?: number; filePath?: string }) {
  const { address, isConnected, checkAllowed, getSignedUrl, getOnchainBalance } = useToken();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setBalance(null);
      setAllowed(null);
      setError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    // preferred: server-side check (verifies and returns allowed)
    checkAllowed(required)
      .then((res: any) => {
        if (!mounted) return;
        if (!res.ok) {
          setError(res.error || "verify_failed");
          setAllowed(false);
          setBalance(res.balance ?? null);
        } else {
          setAllowed(Boolean(res.allowed));
          setBalance(res.balance ?? null);
        }
      })
      .catch((e) => {
        console.error("verify error", e);
        // fallback: try on-chain read
        getOnchainBalance()
          .then((b) => {
            if (!mounted) return;
            setBalance(b);
            setAllowed(b >= required);
          })
          .catch((err) => {
            console.error("onchain read failed", err);
            if (!mounted) return;
            setError("balance_check_failed");
          });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [address, isConnected, checkAllowed, getOnchainBalance, required]);

  async function handleDownload() {
    if (!isConnected || !address) {
      alert("Connect your wallet first");
      return;
    }
    setLoading(true);
    try {
      const res = await getSignedUrl(required, filePath);
      if (!res.ok) {
        alert("Access denied: " + (res.error || "insufficient"));
        return;
      }
      // open signed URL
      window.open(res.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Failed to fetch resource");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-md bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">FlowSend Token</h3>
          <p className="text-sm text-muted-foreground">
            Use FST to unlock premium features and gated content.
          </p>
        </div>
        <div className="text-right">
          <Badge className="bg-yellow-100 text-yellow-800">Base Sepolia</Badge>
        </div>
      </div>

      <div className="mt-3">
        {!isConnected && <div className="text-sm text-gray-600">Connect your wallet to see your balance and perks.</div>}

        {isConnected && (
          <>
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="text-xs text-gray-500">Balance</div>
                <div className="text-lg font-medium">{loading ? "Checking..." : (balance ?? "—")} FST</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Required</div>
                <div className="text-lg font-medium">{required} FST</div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button onClick={handleDownload} disabled={!allowed || loading}>
                {loading ? "Checking…" : (allowed ? "Download PPT" : "Locked")}
              </Button>

              {!allowed && (
                <Button variant="outline" onClick={() => window.location.href = "/mint"}>
                  Get / Mint Tokens
                </Button>
              )}
            </div>

            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
