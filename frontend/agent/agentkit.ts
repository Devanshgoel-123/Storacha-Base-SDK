// /agent/agentkit.ts
import {
  AgentKit,
  CdpEvmWalletProvider,
  walletActionProvider,
  erc20ActionProvider,
  erc721ActionProvider,
  pythActionProvider,
} from "@coinbase/agentkit";
import { GeminiAgent } from "@/lib/gemini";
// import { getLangChainTools } from "@coinbase/agentkit-langchain";

/**
 * Create a configured AgentKit instance using the installed @coinbase/agentkit.
 *
 * This uses the CDP EVM wallet provider configured from environment
 * variables. The repository included CDP env vars in `.env` (CDP_API_KEY_NAME
 * and CDP_API_KEY_PRIVATE_KEY). If you prefer a different wallet provider
 * (e.g. viem or privy), swap the provider here.
 */
export function createAgentKitInstance() {
  // Construct a configured wallet provider from CDP secrets.
  // The CdpEvmWalletProvider provides `configureWithWallet` which uses the
  // CDP SDK and environment secrets to create a provider instance.

  // Read env vars (these should exist in your runtime or .env in dev).
  const cdpApiKeyName = process.env.CDP_API_KEY_NAME;
  const cdpApiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

  if (!cdpApiKeyName || !cdpApiKeyPrivateKey) {
    console.error("CDP credentials missing:", {
      hasKeyName: !!cdpApiKeyName,
      hasPrivateKey: !!cdpApiKeyPrivateKey
    });
    throw new Error("CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables are required");
  }

  // Prepare a promise-based initialization function for AgentKit.from
  const init = async () => {
    try {
      console.log("Initializing CDP wallet provider...");
      
      // Configure CDP wallet provider
      const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
        apiKeyId: cdpApiKeyName,
        apiKeySecret: cdpApiKeyPrivateKey,
      });

      console.log("Wallet provider configured successfully");

      // Create AgentKit with the walletProvider and action providers
      const actionProviders = [
        walletActionProvider(),
        erc20ActionProvider(),
        erc721ActionProvider(),
        pythActionProvider(),
      ];

      const kit = await AgentKit.from({
        walletProvider: walletProvider,
        actionProviders: actionProviders,
      });

      console.log("AgentKit initialized successfully");
      return kit;
    } catch (error) {
      console.error("Failed to initialize AgentKit:", error);
      throw error;
    }

    // Create AgentKit with the walletProvider and a set of action providers
    // that make sense for a Base mini-app.
    // const kit = await AgentKit.from({
    //   walletProvider,
    //   actionProviders: [
    //     walletActionProvider(),
    //     erc20ActionProvider(),
    //     erc721ActionProvider(),
    //     pythActionProvider(),
    //   ],
    // });

    // return kit;
  };

  // Return a thin wrapper that exposes createAgent similar to the fallback,
  // but backed by the real AgentKit instance when initialized.
  let cachedKit: AgentKit | null = null;

  return {
    createAgent: (opts: {
      id?: string;
      name?: string;
      model?: string;
      instructions?: string;
    }) => {
      return {
        id: opts.id ?? "base-miniapp-agent",
        name: opts.name ?? "Base MiniApp Agent",
        model: opts.model ?? "gpt-4o-mini",
        instructions: opts.instructions ?? "",
        run: async ({ input, context }: { input: any; context?: any }) => {
          try {
            // Initialize AgentKit if not already initialized
            if (!cachedKit) {
              console.log("Initializing AgentKit with CDP credentials...");
              cachedKit = await init();
              if (!cachedKit) {
                throw new Error("Failed to initialize AgentKit. Please check CDP credentials.");
              }
              console.log("AgentKit initialized successfully with CDP wallet provider");
            }

                        // Support a direct confirm/execute call from the frontend: { confirm: true, action: { name, args } }
            if (
              input &&
              typeof input === "object" &&
              input.confirm === true &&
              input.action
            ) {
              try {
                const actions = cachedKit.getActions();
                const target = actions.find(
                  (a: any) =>
                    a.name === input.action.name ||
                    a.name?.toLowerCase() === input.action.name?.toLowerCase()
                );
                if (!target) return `Unknown action: ${input.action.name}`;
                const result = await target.invoke(input.action.args ?? {});
                return String(result ?? "");
              } catch (err) {
                return `Execution failed: ${String(err)}`;
              }
            }

            // Use AgentKit's action providers to respond.
            // Strategy:
            // - Get available actions from the kit (these are bound to the configured wallet provider).
            // - Try to match the user's message to a sensible action (e.g., balance/wallet -> wallet details).
            // - If a matching action is found, invoke it with an empty object (many actions accept minimal args).
            // - If no match, return a list of available actions the agent can perform.
          }
          catch (err) {
            return `Agent initialization error: ${String(err)}`;
          }
          
          // Use AgentKit's action providers to respond.
          // Strategy:
          // - Get available actions from the kit (these are bound to the configured wallet provider).
          // - Try to match the user's message to a sensible action (e.g., balance/wallet -> wallet details).
          // - If a matching action is found, invoke it with an empty object (many actions accept minimal args).
          // - If no match, return a list of available actions the agent can perform.

          const msgs = Array.isArray(input) ? input : [input];
          const text = msgs
            .map((m: any) =>
              typeof m === "string" ? m : m.content ?? JSON.stringify(m)
            )
            .join("\n");

          const walletInfo = (context as any)?.wallet;

          try {
            const actions = cachedKit.getActions();

            // Basic keyword mapping to common actions
            const q = text.toLowerCase();
            let chosenAction = null as any;

            if (q.includes("balance") || q.includes("wallet")) {
              chosenAction = actions.find(
                (a: any) =>
                  a.name?.toLowerCase().includes("wallet") ||
                  a.name?.toLowerCase().includes("getwallet")
              );
            }

            if (!chosenAction && q.includes("token") && q.includes("balance")) {
              chosenAction = actions.find(
                (a: any) =>
                  a.name?.toLowerCase().includes("erc20") ||
                  a.name?.toLowerCase().includes("getbalance")
              );
            }

            // Fallback: try to match any action name or description token
            if (!chosenAction) {
              chosenAction = actions.find((a: any) => {
                const name = (a.name || "").toLowerCase();
                const desc = (a.description || "").toLowerCase();
                return q
                  .split(/\s+/)
                  .some((tok) => name.includes(tok) || desc.includes(tok));
              });
            }

            if (chosenAction) {
              try {
                // Many actions accept an empty object or specific args; we attempt
                // an empty object for common read-only actions.
                const result = await chosenAction.invoke({});
                return String(result ?? "");
              } catch (err) {
                return `Agent action failed: ${String(err)}`;
              }
            }
            // No matching action: fall back to a natural-language reply using OpenAI
            // if available; otherwise list the available actions.
            const geminiKey = process.env.GEMINI_API_KEY;
            if (geminiKey) {
              try {
                const geminiKey = process.env.GEMINI_API_KEY;
                if (!geminiKey) {
                  throw new Error("GEMINI_API_KEY not found in environment");
                }

                const client = new GeminiAgent(
                  geminiKey,
                  "gemini-pro",
                  opts.instructions ?? ""
                );

                const system =
                  opts.instructions ??
                  "You are an assistant that can query on-chain data and prepare transactions. Do not execute transactions without explicit user confirmation.";

                const walletContext = walletInfo
                  ? `Wallet context: ${JSON.stringify(walletInfo)}`
                  : "";

                const response = await client.getResponse(
                  system + (walletContext ? `\n${walletContext}` : ""),
                  text
                );

                const reply = response ?? "";
                return reply;
              } catch (err) {
                // If Gemini call fails, fall back to listing actions
                console.error("Gemini call failed:", err);
              }
            }

            // If no OpenAI key or call failed, return a friendly list of available actions
            const summary = actions
              .map(
                (a: any) =>
                  `- ${a.name}${a.description ? `: ${a.description}` : ""}`
              )
              .slice(0, 50)
              .join("\n");

            return `I couldn't map your request to a specific onchain action. I can perform the following actions (examples):\n${summary}${
              walletInfo
                ? `\n\nWallet context present: ${JSON.stringify(walletInfo)}`
                : ""
            }`;
          } catch (err) {
            return `AgentKit error: ${String(err)}`;
          }
        },
      };
    },
  };
}
