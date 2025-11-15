// components/LayoutDashboard.tsx
"use client";

import React from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import WalletConnect from "@/components/WalletConnect";
import { Home, ArrowDownToLine, ArrowUpFromLine, Send, MessageSquare, CreditCard, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const nav = [
    { href: "/dashboard", label: "Overview", icon: Home },
    { href: "/dashboard?view=deposit", label: "Deposit", icon: ArrowDownToLine },
    { href: "/dashboard?view=withdraw", label: "Withdraw", icon: ArrowUpFromLine },
    { href: "/dashboard?view=transfer", label: "Transfer", icon: Send },
    { href: "/dashboard?view=ai", label: "AI Chat", icon: MessageSquare },
    { href: "/dashboard?view=mint", label: "Mint", icon: CreditCard },
    { href: "/dashboard?view=fst", label: "FST Benefits", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm text-slate-500 uppercase mb-2">Navigation</h4>
                <nav className="flex flex-col gap-1">
                  {nav.map((n) => {
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-50"
                      >
                        <Icon className="w-5 h-5 text-slate-600" />
                        <span className="text-sm">{n.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

           

              <div className="bg-white rounded-lg p-4 shadow-sm text-sm text-slate-600">
                <div className="font-medium mb-1">Quick Tips</div>
                <ul className="list-disc ml-4">
                  <li>Keep owner key on server only.</li>
                  <li>Protect /api/mint with a token in production.</li>
                  <li>Remove dev-only UI before public deploy.</li>
                </ul>
              </div>
              <div>
                <WalletConnect />
              </div>
            </div>
          </aside>

          {/* Main content area */}
          <main className="lg:col-span-9 space-y-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
