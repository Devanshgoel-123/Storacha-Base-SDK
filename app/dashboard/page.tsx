// app/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useAccount, useBalance } from "wagmi";
import WalletConnect from "@/components/WalletConnect";
import GaslessPayment from "@/components/GaslessPayment";
import { ChatInterface } from "@/components/chat-interface";
import MintPanel from "@/components/MintPanel";
import CircleDeposit from "@/components/CircleDeposit";
import CircleWithdraw from "@/components/CircleWithdraw";
import { CheckCircle, Lock } from "lucide-react";
import { CONTRACTS } from "@/lib/utils";

/**
 * Dashboard page:
 * - Overview contains all metrics (balances, totals, tier, staked FST)
 * - Sidebar navigation handled by LayoutDashboard (links with query param `view`)
 * - view is read from URL query `view` (so nav links work and deep-link)
 *
 * Remove additional components from main area — only render those views on demand.
 */

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const urlView = searchParams?.get("view") ?? "overview";

  const [view, setView] = useState<
    "overview" | "deposit" | "withdraw" | "transfer" | "ai" | "mint" | "fst" | "gasless"
  >((urlView as any) || "overview");

  // keep view synced with URL query param
  useEffect(() => {
    if (!urlView) return;
    setView(urlView as any);
  }, [urlView]);

  // On-chain balances & metrics
  const { address, isConnected } = useAccount();

  const usdcToken = CONTRACTS.USDC as `0x${string}` | undefined;
  const fstToken = CONTRACTS.FST as `0x${string}` | undefined;

  const { data: usdcBalance } = useBalance({
    address,
    token: usdcToken,
    query: { enabled: Boolean(address && usdcToken) },
  });

  const { data: fstBalance } = useBalance({
    address,
    token: fstToken,
    query: { enabled: Boolean(address && fstToken) },
  });

  // Example KPIs — in real app derive from backend / subgraph
  const totalSent = useMemo(() => "0.00 USDC", []); // fetch from analytics
  const totalReceived = useMemo(() => "0.00 USDC", []);
  const gasSaved = useMemo(() => "0.00 USDC", []);
  const stakedFst = useMemo(() => "0.00 FST", []);

  const usdcFormatted = usdcBalance?.formatted ? `${parseFloat(usdcBalance.formatted).toFixed(2)} USDC` : "0.00 USDC";
  const fstFormatted = fstBalance?.formatted ? `${parseFloat(fstBalance.formatted).toFixed(2)} FST` : "0.00 FST";

  const tiers = [
    { id: "platinum", min: 5000, label: "Platinum", color: "bg-yellow-100", rank: 4 },
    { id: "gold", min: 1000, label: "Gold", color: "bg-orange-100", rank: 3 },
    { id: "silver", min: 100, label: "Silver", color: "bg-sky-100", rank: 2 },
    { id: "bronze", min: 10, label: "Bronze", color: "bg-green-100", rank: 1 },
    { id: "free", min: 0, label: "Free", color: "bg-slate-100", rank: 0 },
  ];

  function getTier(amount: number) {
    for (const t of tiers) {
      if (amount >= t.min) return t;
    }
    return tiers[tiers.length - 1];
  }
  const fstNum = useMemo(() => {
    if (!fstBalance?.formatted) return 0;
    const n = Number.parseFloat(fstBalance.formatted);
    return Number.isFinite(n) ? n : 0;
  }, [fstBalance]);


  const userTier = getTier(fstNum);

  // Benefits list (ordered by importance). Each benefit has a minimum required tier rank.
  const benefits = [
    { id: "fee-discount", title: "Fee Discounts", desc: "Reduced fees on on/off ramps & transfers.", rankRequired: 1 },
    { id: "priority-support", title: "Priority Support", desc: "Access priority support & SLAs.", rankRequired: 2 },
    { id: "staking-rewards", title: "Staking Rewards", desc: "Stake FST to earn USDC or FST rewards.", rankRequired: 1 },
    { id: "higher-limits", title: "Higher Limits", desc: "Higher daily and monthly transaction limits.", rankRequired: 2 },
    { id: "batch-sending", title: "Batch Sending", desc: "Unlock batch send & merchant tools.", rankRequired: 3 },
    { id: "governance", title: "Governance Voting", desc: "Vote on product features & fees.", rankRequired: 1 },
    { id: "priority-settlement", title: "Priority Settlement", desc: "Faster settlement windows for Platinum holders.", rankRequired: 4 },
  ];

  const unlockedBenefits = benefits.filter((b) => b.rankRequired <= userTier.rank);
  const lockedBenefits = benefits.filter((b) => b.rankRequired > userTier.rank);

  return (
    <div>
      {/* Overview metrics row (always show on overview view) */}
      {view === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card className="p-4">
            <h3 className="text-sm text-slate-500">USDC Balance</h3>
            <div className="text-xl font-bold">{usdcFormatted}</div>
            <div className="text-xs text-slate-500 mt-1">On-chain balance (Base)</div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm text-slate-500">FST Balance</h3>
            <div className="text-xl font-bold">{fstFormatted}</div>
            <div className="text-xs text-slate-500 mt-1">Utility token — staking & benefits</div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm text-slate-500">Total Sent</h3>
            <div className="text-xl font-bold">{totalSent}</div>
            <div className="text-xs text-slate-500 mt-1">Lifetime</div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm text-slate-500">Gas Saved</h3>
            <div className="text-xl font-bold">{gasSaved}</div>
            <div className="text-xs text-slate-500 mt-1">Sponsorship & optimizations</div>
          </Card>
        </div>
      )}

      {/* Main grid: content on left; wallet + nav on right (LayoutDashboard will provide sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <main className="lg:col-span-8 space-y-4">
          {view === "overview" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Overview</h2>
              <p className="text-sm text-slate-600 mb-4">
                Quick actions, recent activity and account summary. Use the sidebar to navigate other tools.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <div className="border rounded p-4">
                  <h4 className="font-semibold mb-2">Account Summary</h4>
                  <p className="text-sm text-slate-600">Address: {isConnected ? address : "Not connected"}</p>
                  <p className="text-sm text-slate-600">USDC: {usdcFormatted}</p>
                  <p className="text-sm text-slate-600">FST: {fstFormatted}</p>
                  <p className="text-sm text-slate-600">Staked FST: {stakedFst}</p>
                </div>

                <div className="border rounded p-4">
                  <h4 className="font-semibold mb-2">Usage & Benefits</h4>
                  <ul className="list-disc ml-5 text-sm text-slate-600">
                    <li>Gasless transfers for sponsored flows</li>
                    <li>FST holders receive fee discounts and priority</li>
                    <li>View transactions and analytics (coming soon)</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Other views: keep minimal and navigable */}
          {view === "transfer" && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-2">Transfer</h2>
              <p className="text-sm text-slate-600 mb-3">Use the gasless transfer panel below.</p>
              <GaslessPayment />
            </Card>
          )}

          {view === "ai" && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">AI Assistant</h2>
              <ChatInterface />
            </Card>
          )}

          {view === "mint" && <MintPanel />}

          {view === "deposit" && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-2">Deposit</h2>
              <CircleDeposit />
            </Card>
          )}

          {view === "withdraw" && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-2">Withdraw</h2>
              <CircleWithdraw />
            </Card>
          )}

          {view === "fst" && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-3">FST Token — Benefits & Utilities</h2>
              <p className="text-sm text-slate-600 mb-4">
                FST (FlowSend Token) powers premium features in the app. Holders receive fee discounts,
                priority support, staking rewards, and governance participation. Below are the key utilities.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <h3 className="font-semibold mb-1">Fee Discounts</h3>
                  <p className="text-sm text-slate-600">
                    FST holders get reduced transaction or processing fees on certain off-ramp and on-ramp flows.
                  </p>
                </div>

                <div className="p-4 border rounded">
                  <h3 className="font-semibold mb-1">Priority Settlement & Support</h3>
                  <p className="text-sm text-slate-600">
                    Holders are eligible for priority processing and dedicated customer support channels.
                  </p>
                </div>

                <div className="p-4 border rounded">
                  <h3 className="font-semibold mb-1">Staking Rewards</h3>
                  <p className="text-sm text-slate-600">
                    Stake FST to earn rewards paid in USDC or additional FST.
                  </p>
                </div>

                <div className="p-4 border rounded">
                  <h3 className="font-semibold mb-1">Governance & Voting</h3>
                  <p className="text-sm text-slate-600">
                    Participate in governance for product & fee decisions.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </main>

        {/* Right column: sidebar (kept minimal) */}
        <aside className="lg:col-span-4 space-y-4">
        
        <Card className="p-4">
            <h3 className="font-semibold mb-2">FST Benefits</h3>

            <div className="text-sm text-slate-600 mb-3">
              <div>Tier: <span className="font-medium">{userTier.label}</span></div>
              <div>FST: <span className="font-medium">{fstFormatted}</span></div>
            </div>

            <div className="space-y-2">
              {unlockedBenefits.length > 0 ? (
                unlockedBenefits.map((b) => (
                  <div key={b.id} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div className="text-sm">
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-slate-500">{b.desc}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No unlocked benefits. Acquire FST to unlock perks.</div>
              )}
            </div>

            {lockedBenefits.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-2">Locked benefits</div>
                <div className="space-y-2">
                  {lockedBenefits.map((b) => (
                    <div key={b.id} className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="text-xs text-slate-500">{b.title} — requires higher tier</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button onClick={() => setView("fst")}>View all benefits</Button>
              <Button variant="outline" onClick={() => setView("mint")}>Get FST</Button>
            </div>
          </Card>

        </aside>
      </div>
    </div>
  );
}
