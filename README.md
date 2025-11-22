# Storacha Base SDK

**Storacha Base SDK** provides a unified interface for interacting with Storacha’s decentralized storage APIs and payment systems — serving as the **foundation layer** for all Storacha blockchain integrations (Solana, Filecoin, and beyond).
It offers essential utilities, common data models, and standardized request/response handling used across all Storacha SDKs.

## Features

* **Unified Core Interfaces** – Shared abstractions for storage, payments, and access delegation.
* **Cross-Chain Ready** – Designed to seamlessly integrate with Storacha Solana, Filecoin, and future SDKs.
* **Lightweight Utility Layer** – Handles authentication, UCAN signing, and API request composition.
* **TypeScript-first** – Fully typed with excellent DX for both Node.js and browser environments.
* **Extensible** – Add new chain adapters easily without modifying the base layer.

## Monorepo Structure

```
storacha-base-payments/
├─ contracts/
│  ├─ contracts/StoragePayments.sol
│  ├─ scripts/deploy.ts
│  ├─ test/storagePayments.test.ts
│  └─ hardhat.config.ts
├─ backend/
│  ├─ src/
│  │  ├─ listener.ts                # listens to Deposit events, credits DB
│  │  ├─ pricing.ts                 # credits math & conversion
│  │  ├─ ucan.ts                    # UCAN creation helper (server-side)
│  │  └─ prismaClient.ts
│  ├─ prisma/
│  │  └─ schema.prisma
│  └─ package.json
├─frontend/                            # Next.js app
│ ├─ app/                            
│ │  ├─ api/
│ │  │  └─ storacha/
│ │  │     ├─ upload/route.ts
│ │  │     ├─ list/route.ts
│ │  │     ├─ get/route.ts
│ │  │     └─ delete/route.ts
│ │  └─ components/
│ │     ├─ StorachaFiles.tsx
│ │     └─ TopUpCredits.tsx
├─ sdk/ 
├─ .env.example
└─ README.md

```

## Quick Start

### **1. Prerequisites**

* [Node.js >= 20](https://nodejs.org/en/)
* [pnpm](https://pnpm.io/installation)

### **2. Clone & Install**

```bash
git clone https://github.com/seetadev/storacha-base-sdk.git
cd storacha-base-sdk
pnpm install
```

### **3. Build**

```bash
pnpm build
```

### **4. Example Usage**

```typescript
import { StorachaClient } from "@storacha/base-sdk";

const client = new StorachaClient({
  endpoint: "https://api.storacha.io",
  ucanKey: process.env.UCAN_KEY,
});

// Upload metadata or initialize a payment flow
const result = await client.uploadMetadata({
  name: "example.txt",
  size: 1024,
});

console.log("Upload initialized:", result);
```

## Testing

```bash
pnpm test
```

## Integration Notes

* **Used by:** `@storacha/sol-sdk`, `@storacha/fil-sdk`, and other chain-specific SDKs.
* **Auth Layer:** Supports UCAN token delegation for secure access control.
* **HTTP Client:** Uses `fetch` under the hood with retry and timeout strategies.
* **Type Safety:** Full TypeScript definitions included.

---

### Side Notes

* Keep your `.env` file configured with:

  ```
  STORACHA_API_KEY=<your_api_key>
  UCAN_KEY=<your_ucan_key>
  ```
* The SDK is framework-agnostic — works in Node.js, Deno, and browser environments.
* Ideal for building custom storage/payment flows on top of Storacha’s decentralized infrastructure.


