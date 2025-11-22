// components/Navbar.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="w-full bg-transparent absolute top-6 left-0 z-20">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">FS</div>
          <div className="hidden md:block">
            <div className="font-bold text-lg">FlowSend</div>
            <div className="text-xs text-slate-500">Gasless cross-border payments</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="sm" className="hidden sm:inline-flex">Launch App</Button>
          </Link>
          <a href="https://www.youtube.com/watch?v=FlFVucAgkOc" target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">View Demo</Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
