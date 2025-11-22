"use client";

import { useState, useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { Card } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Dialog } from "./dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ActionConfirmation {
  action: string;
  args: Record<string, any>;
  description: string;
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionToConfirm, setActionToConfirm] =
    useState<ActionConfirmation | null>(null);
  const { context } = useMiniKit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !context?.user) return;

    // Add user message
    const newMessages: Message[] = [...messages, { role: "user" as "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Send to agent API
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            wallet: context.user,
          },
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // If the response requires action confirmation
      if (data.requiresConfirmation) {
        setActionToConfirm({
          action: data.action,
          args: data.args || {},
          description:
            data.description || "This action requires your confirmation",
        });
      }

      // Add agent response
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.reply || data.message },
      ]);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionToConfirm || !context?.user) return;

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          action: actionToConfirm.action,
          args: actionToConfirm.args,
          context: {
            wallet: context.user,
          },
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.result || "Action executed successfully",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error executing action: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ]);
    } finally {
      setActionToConfirm(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <div className="space-y-4">
        {/* Messages display */}
        <div className="h-[400px] overflow-y-auto space-y-4 p-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              context?.user
                ? "Ask about tokens, NFTs, or other on-chain actions..."
                : "Connect wallet to chat"
            }
            disabled={!context?.user || isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!context?.user || isLoading}>
            {isLoading ? "Thinking..." : "Send"}
          </Button>
        </form>
      </div>

      {/* Action confirmation dialog */}
      <Dialog
        open={!!actionToConfirm}
        onOpenChange={() => setActionToConfirm(null)}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
          <p className="mb-6">{actionToConfirm?.description}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setActionToConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAction}>Confirm</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
