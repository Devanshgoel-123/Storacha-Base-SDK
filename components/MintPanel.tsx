// components/MintPanel.tsx
"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MintPanel() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMint(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setResult(null);
    if (!to || !amount) return setError("Recipient and amount required");
    if (Number.isNaN(Number(amount))) return setError("Invalid amount");

    setLoading(true);
    try {
      const headers: Record<string,string> = { "Content-Type": "application/json" };
      const token = process.env.NEXT_PUBLIC_MINT_API_TOKEN;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/token/mint", {
        method: "POST",
        headers,
        body: JSON.stringify({ to, amount }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Mint failed");
      } else {
        setResult(json?.txHash ? `Tx: ${json.txHash}` : "Mint submitted");
        setTo("");
        setAmount("");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-2">Mint / Faucet (Server-side)</h2>
      <p className="text-sm text-slate-600 mb-4">Mint tokens using server-side owner key. Protect this route in production.</p>

      <form onSubmit={handleMint} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input value={to} onChange={(e)=>setTo(e.target.value)} placeholder="Recipient address" className="md:col-span-2" />
        <Input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount" />

        <div className="md:col-span-3 flex gap-2 mt-2">
          <Button type="submit" disabled={loading}>{loading ? "Sending…" : "Mint"}</Button>
          <Button variant="outline" onClick={()=>{ setTo(""); setAmount(""); setResult(null); setError(null); }}>Reset</Button>
        </div>
      </form>

      <div className="mt-4">
        {result && <div className="text-sm text-green-700">{result}</div>}
        {error && <div className="text-sm text-red-700">{error}</div>}
      </div>
    </Card>
  );
}
