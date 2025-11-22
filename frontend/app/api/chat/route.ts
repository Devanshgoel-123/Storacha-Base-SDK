import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

let aiInstance: GoogleGenerativeAI | null = null;

function getAI() {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return aiInstance;
}

interface BankingAction {
  type:
    | "get_bank_accounts"
    | "deposit_usdc"
    | "withdraw_usdc"
    | "send_usdc"
    | "check_balance"
    | "transfer_usdc"
    | "none";
  params?: {
    amount?: number;
    bankAccountId?: string;
    recipient_address?: string;
  };
}

async function parseWithAI(
  messages: Array<{ role: string; content: string }>,
): Promise<BankingAction> {
  const genAI = getAI();
  if (!genAI) return { type: "none" };

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Build conversation context
  const conversationContext = messages
    .slice(-5) // Last 5 messages for context
    .map((msg) => msg.role + ": " + msg.content)
    .join("\n");

  const prompt =
    "Analyze this conversation and determine if the user is requesting a banking action. Extract ALL parameters from the conversation history, even if they were mentioned in previous messages. Respond ONLY with valid JSON.\n\nConversation:\n" +
    conversationContext +
    '\n\nExamples:\n- check my balance -> {"type": "check_balance", "params": {}}\n- what\'s my balance -> {"type": "check_balance", "params": {}}\n- transfer 10 USDC to 0x123 -> {"type": "transfer_usdc", "params": {"amount": 10, "recipient_address": "0x123"}}\n- send 10 USDC to 0x123 -> {"type": "transfer_usdc", "params": {"amount": 10, "recipient_address": "0x123"}}\n- deposit 100 usdc -> {"type": "deposit_usdc", "params": {"amount": 100}}\n- withdraw 50 USDC -> {"type": "withdraw_usdc", "params": {"amount": 50}}\n- user: withdraw 50 USDC\\nassistant: which account?\\nuser: account abc123 -> {"type": "withdraw_usdc", "params": {"amount": 50, "bankAccountId": "abc123"}}\n- show my bank accounts -> {"type": "get_bank_accounts", "params": {}}\n- what is defi -> {"type": "none", "params": {}}';

  try {
    console.log("Calling Gemini API for intent parsing...");
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    console.log("Gemini response:", text);

    // Remove markdown code blocks if present
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Error parsing with AI:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.stack : error,
    );
  }

  return { type: "none" };
}

async function executeBankingAction(
  action: BankingAction,
  walletAddress?: string,
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    switch (action.type) {
      case "get_bank_accounts": {
        const response = await fetch(baseUrl + "/api/circle/bank-accounts", {
          headers: walletAddress ? { "x-wallet-address": walletAddress } : {},
        });
        const data = await response.json();

        if (data.success && data.bankAccounts && data.bankAccounts.length > 0) {
          const accounts = data.bankAccounts
            .map((acc: any, idx: number) => {
              const name = acc.billingDetails?.name || "Bank Account";
              const id = acc.id;
              const last4 = acc.accountNumber?.slice(-4) || "****";
              return (
                idx +
                1 +
                ". " +
                name +
                " (ID: " +
                id +
                ") - Account ending in " +
                last4
              );
            })
            .join("\n");
          return (
            "Here are your linked bank accounts:\n\n" +
            accounts +
            "\n\nYou can use the account ID to deposit or withdraw funds."
          );
        } else {
          return "You do not have any bank accounts linked yet. Would you like help adding a bank account?";
        }
      }

      case "deposit_usdc": {
        if (!walletAddress) {
          return "Please connect your wallet first to deposit USDC.";
        }

        if (!action.params?.amount) {
          return "I can help you deposit USDC from your Circle account to your wallet. How much USDC would you like to deposit?";
        }

        const response = await fetch(
          baseUrl + "/api/circle/deposit/transfer-to-wallet",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: action.params.amount,
              userAddress: walletAddress,
            }),
          },
        );

        const data = await response.json();

        if (data.success) {
          let message =
            "✅ Successfully initiated deposit of " +
            action.params.amount +
            " USDC to your wallet!\n\nTransaction ID: " +
            (data.transfer?.id || "N/A");

          if (data.txHash) {
            message +=
              "\n\nTransaction Hash: " +
              data.txHash +
              "\nView on BaseScan: https://sepolia.basescan.org/tx/" +
              data.txHash;
          }

          message +=
            "\n\nThe USDC should appear in your wallet shortly. You can check your balance in the wallet section above.";

          return message;
        } else {
          return (
            "❌ Deposit failed: " +
            (data.error || "Unknown error") +
            ". Please make sure you have sufficient USD balance in your Circle account.\n\nYou may need to deposit funds to your Circle account first via wire transfer. Would you like help with that?"
          );
        }
      }

      case "withdraw_usdc": {
        if (!walletAddress) {
          return "Please connect your wallet first to withdraw USDC.";
        }

        if (!action.params?.amount) {
          return "I can help you withdraw USDC to your bank account. How much USDC would you like to withdraw?";
        }

        if (!action.params?.bankAccountId) {
          const bankResponse = await fetch(
            baseUrl + "/api/circle/bank-accounts",
            {
              headers: walletAddress
                ? { "x-wallet-address": walletAddress }
                : {},
            },
          );
          const bankData = await bankResponse.json();

          if (
            bankData.success &&
            bankData.bankAccounts &&
            bankData.bankAccounts.length > 0
          ) {
            const accounts = bankData.bankAccounts
              .map((acc: any, idx: number) => {
                const name = acc.billingDetails?.name || "Bank Account";
                const id = acc.id;
                const last4 = acc.accountNumber?.slice(-4) || "****";
                return (
                  idx +
                  1 +
                  ". " +
                  name +
                  " (ID: " +
                  id +
                  ") - Account ending in " +
                  last4
                );
              })
              .join("\n");
            return (
              "Great! I'll help you withdraw " +
              action.params.amount +
              " USDC. Which bank account would you like to use?\n\n" +
              accounts +
              "\n\nPlease tell me the account ID or the account number."
            );
          } else {
            return "You need to add a bank account first before withdrawing. Please go to the 'Withdraw' or 'Deposit' tab to add your bank account details.";
          }
        }

        return JSON.stringify({
          type: "TRANSACTION_REQUEST",
          action: "withdraw_usdc",
          params: {
            amount: action.params.amount,
            bankAccountId: action.params.bankAccountId,
          },
          message:
            "Ready to withdraw " +
            action.params.amount +
            " USDC to your bank account. Please approve the transaction in your wallet.",
        });
      }

      case "check_balance": {
        if (!walletAddress) {
          return "Please connect your wallet first to check your balance.";
        }

        return (
          "You can check your wallet balance in the Wallet section at the top of the page.\n\nYour wallet address is:\n" +
          walletAddress +
          "\n\nThe wallet section shows your:\n• ETH balance (for gas fees)\n• USDC balance (for transfers)\n\nIf you need test tokens, visit:\n• Coinbase Faucet: https://portal.cdp.coinbase.com/products/faucet\n• Base Sepolia Faucet: https://www.alchemy.com/faucets/base-sepolia"
        );
      }

      case "transfer_usdc": {
        if (!walletAddress) {
          return "Please connect your wallet first to transfer USDC.";
        }

        if (!action.params?.amount) {
          return "I can help you transfer USDC. How much USDC would you like to transfer?";
        }

        if (!action.params?.recipient_address) {
          return (
            "I can transfer " +
            action.params.amount +
            " USDC for you. What's the recipient's wallet address?"
          );
        }

        return JSON.stringify({
          type: "TRANSACTION_REQUEST",
          action: "transfer_usdc",
          params: {
            amount: action.params.amount,
            recipient: action.params.recipient_address,
          },
          message:
            "Ready to transfer " +
            action.params.amount +
            " USDC to " +
            action.params.recipient_address +
            ". Please approve the transaction in your wallet.",
        });
      }

      case "send_usdc": {
        if (!action.params?.amount || !action.params?.recipient_address) {
          return "To send USDC, I need both the amount and the recipient address. For example: 'send 10 USDC to 0x123...'";
        }

        if (!walletAddress) {
          return "Please connect your wallet first to send USDC.";
        }

        return (
          "To send " +
          action.params.amount +
          " USDC to " +
          action.params.recipient_address +
          ":\n\n1. Go to the 'Send' tab above\n2. Enter the recipient address: " +
          action.params.recipient_address +
          "\n3. Enter the amount: " +
          action.params.amount +
          " USDC\n4. Click 'Send Payment'\n\nThis will be a gasless transaction - you won't need ETH for gas fees!"
        );
      }

      default:
        return "";
    }
  } catch (error) {
    console.error("Error executing banking action:", error);
    return (
      "Error: " +
      (error instanceof Error ? error.message : "Unknown error occurred") +
      ". Please try again."
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;
    const walletAddress = body.walletAddress;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required");
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    const bankingAction = await parseWithAI(messages);

    if (bankingAction.type !== "none") {
      const actionResult = await executeBankingAction(
        bankingAction,
        walletAddress,
      );
      return new Response(actionResult, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const genAI = getAI();
    if (!genAI) {
      throw new Error("AI instance not initialized");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let walletContext = "";
    if (walletAddress) {
      walletContext =
        "\n\nUser Connected Wallet: " +
        walletAddress +
        "\nNetwork: Base Sepolia Testnet";
    } else {
      walletContext = "\n\nUser has not connected their wallet yet.";
    }

    const systemPrompt =
      "You are a helpful AI assistant for a Base miniapp called FlowSend. You help users understand crypto operations and guide them through transactions on Base Sepolia.\n\nIMPORTANT CONTEXT:\n- This is a Farcaster mini app where users connect their own Coinbase Smart Wallet\n- You CAN execute banking transactions when users request them\n- The app supports gasless transactions for USDC transfers" +
      walletContext +
      "\n\nYOUR CAPABILITIES:\n1. Help users understand their wallet and balances\n2. Guide users through transferring ETH or USDC\n3. Direct users to testnet faucets for test tokens\n4. Explain crypto concepts, DeFi, smart wallets, etc.\n5. Execute Circle banking operations (deposit/withdraw USDC via bank)\n\nBANKING OPERATIONS YOU CAN PERFORM:\n- Show bank accounts: show my bank accounts\n- Deposit USDC: deposit 100 USDC to my wallet\n- Withdraw USDC: withdraw 50 USDC to bank account ID xyz\n\nFor deposits and withdrawals, users need to have:\n- A linked bank account (for withdrawals)\n- Sufficient Circle USD balance (for deposits)\n- Sufficient USDC balance (for withdrawals)\n\nTESTNET FAUCETS:\n- Coinbase Faucet: https://portal.cdp.coinbase.com/products/faucet\n- Base Sepolia Faucet: https://www.alchemy.com/faucets/base-sepolia\n\nBe conversational, helpful, and clear. Always explain what is happening with transactions.";

    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand. I am ready to help users with their crypto operations and banking transactions on FlowSend.",
            },
          ],
        },
        ...history,
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();

    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
