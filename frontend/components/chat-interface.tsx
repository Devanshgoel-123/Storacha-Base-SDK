"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  Bot,
  User,
  Wallet,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { useBaseAccount } from "@/lib/hooks/useBaseAccount";
import { parseUnits, encodeFunctionData, numberToHex } from "viem";
import {
  BASE_SEPOLIA_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  ERC20_ABI,
} from "@/lib/constants";

const TREASURY_ADDRESS = "0x9de5b155a9f89c343ced429a5fe10eb60750ffc0";

export function ChatInterface() {
  const { address, isConnected } = useAccount();
  const { provider, address: fromAddress, isInitialized } = useBaseAccount();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<
    Array<{ id: string; role: string; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const executeTransaction = async (
    params: { amount: number; recipient?: string; bankAccountId?: string },
    action: string,
  ) => {
    if (!provider || !fromAddress || !isInitialized) {
      throw new Error("Wallet not initialized");
    }

    const paymasterServiceUrl =
      process.env.NEXT_PUBLIC_PAYMASTER_PROXY_SERVER_URL ||
      process.env.NEXT_PUBLIC_PAYMASTER_URL;

    if (!paymasterServiceUrl) {
      throw new Error("Paymaster service URL not configured");
    }

    const amountWei = parseUnits(params.amount.toString(), 6);

    // Determine recipient based on action type
    const recipient =
      action === "withdraw_usdc"
        ? TREASURY_ADDRESS
        : (params.recipient as string);

    const calls = [
      {
        to: USDC_CONTRACT_ADDRESS,
        value: "0x0",
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipient as `0x${string}`, amountWei],
        }),
      },
    ];

    const result = await provider.request({
      method: "wallet_sendCalls",
      params: [
        {
          version: "1.0",
          chainId: numberToHex(BASE_SEPOLIA_CHAIN_ID),
          from: fromAddress,
          calls: calls,
          capabilities: {
            paymasterService: {
              url: paymasterServiceUrl,
            },
          },
        },
      ],
    });

    return result as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          walletAddress: address,
        }),
      });

      const text = await response.text();

      // Check if response is a transaction request
      let transactionRequest = null;
      try {
        const parsed = JSON.parse(text);
        console.log("Parsed response:", parsed);
        if (parsed.type === "TRANSACTION_REQUEST") {
          transactionRequest = parsed;
          console.log("Transaction request detected:", transactionRequest);
        }
      } catch (e) {
        // Not JSON, treat as regular message
        console.log("Not a JSON response, treating as regular message");
      }

      if (transactionRequest) {
        console.log(
          "Executing transaction with params:",
          transactionRequest.params,
        );
        // Show transaction message
        const txMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: transactionRequest.message,
        };
        setMessages((prev) => [...prev, txMessage]);

        // Execute transaction
        try {
          console.log("About to execute transaction...");
          const txHash = await executeTransaction(
            transactionRequest.params,
            transactionRequest.action,
          );
          console.log("Transaction successful, hash:", txHash);

          // Handle post-transaction actions
          if (transactionRequest.action === "withdraw_usdc") {
            // After wallet transaction, call Circle API to initiate payout
            try {
              const withdrawRes = await fetch("/api/circle/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: transactionRequest.params.amount,
                  bankAccountId: transactionRequest.params.bankAccountId,
                }),
              });

              const withdrawData = await withdrawRes.json();

              if (withdrawData.success) {
                const successMessage = {
                  id: (Date.now() + 2).toString(),
                  role: "assistant",
                  content:
                    "✅ Successfully initiated withdrawal of " +
                    transactionRequest.params.amount +
                    " USDC to your bank account!\n\nTransaction Hash: " +
                    txHash +
                    "\n\nView on BaseScan: https://sepolia.basescan.org/tx/" +
                    txHash +
                    "\n\nPayout ID: " +
                    (withdrawData.payout?.id || "N/A") +
                    "\n\nThe funds should arrive in your bank account within 1-2 business days.",
                };
                setMessages((prev) => [...prev, successMessage]);
              } else {
                throw new Error(withdrawData.error || "Circle payout failed");
              }
            } catch (circleError) {
              const errorMessage = {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content:
                  "⚠️ USDC transferred to treasury but Circle payout failed: " +
                  (circleError instanceof Error
                    ? circleError.message
                    : String(circleError)) +
                  "\n\nTransaction Hash: " +
                  txHash +
                  "\n\nPlease contact support.",
              };
              setMessages((prev) => [...prev, errorMessage]);
            }
          } else {
            // Transfer transaction
            const successMessage = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content:
                "✅ Successfully transferred " +
                transactionRequest.params.amount +
                " USDC to " +
                transactionRequest.params.recipient +
                "!\n\nTransaction Hash: " +
                txHash +
                "\n\nView on BaseScan: https://sepolia.basescan.org/tx/" +
                txHash +
                "\n\nThis was a gasless transaction - no ETH fees required!",
            };
            setMessages((prev) => [...prev, successMessage]);
          }
        } catch (txError) {
          console.error("Transaction execution error:", txError);
          const errorMessage = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content:
              "❌ Transaction failed: " +
              (txError instanceof Error ? txError.message : String(txError)) +
              "\n\nPlease make sure you have sufficient USDC balance and try again.",
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } else {
        // Regular message response
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: text,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Extract transaction hashes from message content
  const extractTxHash = (content: string) => {
    const txHashRegex = /0x[a-fA-F0-9]{64}/g;
    return content.match(txHashRegex)?.[0];
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          {isConnected && (
            <Badge variant="outline" className="text-xs">
              <Wallet className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 mb-4 pr-2">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">
                Start a conversation! I can help you with crypto operations on
                Base.
              </p>
              <div className="text-sm mt-4 space-y-2 max-w-md mx-auto text-left bg-muted/50 rounded-lg p-4">
                <p className="font-medium text-center mb-2">Try asking:</p>
                <p>• &ldquo;What&apos;s my wallet address?&rdquo;</p>
                <p>• &ldquo;How do I send USDC?&rdquo;</p>
                <p>• &ldquo;Where can I get test tokens?&rdquo;</p>
                <p>• &ldquo;Explain what a smart wallet is&rdquo;</p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const txHash = extractTxHash(message.content);

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div className="shrink-0">
                    {message.role === "user" ? (
                      <div className="bg-primary rounded-full p-1">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="bg-blue-500 rounded-full p-1">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>

                    {txHash && (
                      <a
                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on BaseScan
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="shrink-0">
                  <div className="bg-blue-500 rounded-full p-1">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {!isConnected && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4" />
            <span>Connect your wallet above to get started</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything about crypto..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
