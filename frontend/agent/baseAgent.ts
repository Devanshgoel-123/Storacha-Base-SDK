import { createAgentKitInstance } from "./agentkit";

// Create a singleton instance of AgentKit for the miniapp
const agentKitInstance = createAgentKitInstance();

// Export a base agent instance with default configuration
export const baseAgent = agentKitInstance.createAgent({
  id: "base-miniapp-agent",
  name: "Base MiniApp Agent",
  model: "gpt-4",
  instructions: `You are an AI assistant for Base blockchain operations. You can:
    - Check wallet balances
    - Transfer tokens
    - Interact with NFTs
    - Query on-chain data
    
    Before executing any transactions or operations that modify state, always ask for user confirmation.
    When handling token amounts, always specify the units (e.g., ETH, USDC) and verify the values.
    `,
});
