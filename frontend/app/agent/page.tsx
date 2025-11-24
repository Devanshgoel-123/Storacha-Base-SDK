"use client";
import { useState, useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { ChatInterface } from "@/components/chat-interface";
import WalletConnect from "@/components/WalletConnect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Send, Zap } from "lucide-react";
import Link from "next/link";
import styles from "../page.module.css";

export default function Home() {
  const { setMiniAppReady, isMiniAppReady, context } = useMiniKit();

  // Initialize the miniapp
  useEffect(() => {
    if (!isMiniAppReady) setMiniAppReady();
  }, [isMiniAppReady, setMiniAppReady]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.waitlistForm}>
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Send className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold">
                Flow<span className="text-blue-600">Send</span> AI
              </h1>
            </div>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <p className={styles.subtitle}>
                Hey {context?.user?.displayName || "there"}, chat with your AI
                assistant to manage crypto operations on Base.
              </p>
            </div>
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center justify-start space-x-2">
                <div className="flex items-center space-x-1 text-green-600">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-medium">Gas Free Transactions</span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Base Sepolia Testnet
              </Badge>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="mb-3">
            <WalletConnect />
          </div>

          {/* Dashboard Link */}
          <div className="mb-3">
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center space-x-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Chat interface */}
          <div className="mt-8">
            <ChatInterface />
          </div>

        </div>
      </div>
    </div>
  );
}
