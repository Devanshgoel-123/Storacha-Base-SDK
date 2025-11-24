// components/Topbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Bell, NotebookIcon } from "lucide-react";
import { Avatar } from "@coinbase/onchainkit/identity";
import { ConnectWallet, Wallet } from "@coinbase/onchainkit/wallet";

export default function Topbar() {
  const pathname = usePathname();

  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <header className="w-full bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Left: Logo + main link */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg">
            FlowSend
          </Link>

          {/* Only highlight Dashboard on current route */}
          <nav className="hidden md:flex items-center gap-2 text-sm text-slate-700">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded ${
                isDashboard ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              Dashboard
            </Link>
          </nav>
        </div>

        {/* Right: wallet chip + notifications + avatar */}
        <div className="flex items-center gap-4">

          {/* Minimal wallet chip (NOT the full WalletConnect card) */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50">
          <Wallet />
          </div>

          {/* Notifications */}
          <button
            className="p-2 rounded hover:bg-slate-50"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600" />
          </button>

          {/* Avatar */}
          <div className="flex items-center gap-2">
            <Avatar
              className="w-8 h-8 border border-slate-300 rounded-full"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
