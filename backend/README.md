Below is a **clean, production-ready GitHub README.md**, written in proper Markdown formatting, ready to paste directly into your repo.

It includes:

- ✅ Architecture diagram (ASCII)
- ✅ Complete API Documentation
- ✅ Full Flow Explanation
- ✅ Setup instructions
- ✅ Environment variables
- ✅ Contract + Backend details
- ✅ Storacha integration
- ✅ Deposit listener docs
- ✅ Example cURL commands
- ✅ Preview file path: `/mnt/data/page.tsx`

---

# 📦 Storacha Base Storage Backend

A fully on-chain, gasless-compatible, pay-as-you-go storage backend built on:

* **Storacha (`@storacha/client`)**
* **Base Chain (USDC + FST token deposits)**
* **StoragePayments smart contract**
* **MongoDB**
* **UCAN Delegations**

This backend handles:

* On-chain storage credit deposits
* File uploads to Storacha
* Directory uploads & CID verification
* UCAN delegation
* Download & delete
* Access control
* Minimal metadata indexing
* Event-based credit system via smart-contract Deposit listener

---

# 🌐 System Architecture

```
                     ┌────────────────────────────┐
                     │          Frontend           │
                     │   (Next.js / React)         │
                     └──────────────┬──────────────┘
                                    │
                        Wallet Signature + x-wallet
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │           Backend Server             │
                 │    Express + TypeScript + MongoDB    │
                 ├────────────────┬─────────────────────┤
                 │                │                     │
       /preflight API     /upload API              /delegate UCAN
                 │                │                     │
                 ▼                ▼                     ▼
       Check credits       Upload to Storacha     Grant file access
       Deduct credits      Compute + Validate     via UCAN Capabilities
                           CID → Store Metadata
                 │                │
                 └──────┬────────┘
                        │
                        ▼
            ┌────────────────────────────┐
            │       Storacha Storage     │
            │     (client / MCP REST)    │
            └────────────────────────────┘

                                    ▲
                                    │
                     Smart Contract Deposit Listener
                                    │
                      (Credits users after on-chain
                       USDC/FST deposits)
```

---

# 🚀 Features

### ✔ On-chain Storage Credits

Users deposit **USDC or FST token** to the `StoragePayments` contract.
A backend listener converts the deposit amount into app credits (USD → credits).

### ✔ Upload Files to Storacha

* Precompute CID to ensure integrity
* Upload via Storacha client or REST fallback
* Store **minimal metadata** in Mongo
* Return preview path: `/mnt/data/page.tsx`

### ✔ UCAN Delegation

Delegate read/write capability for a particular CID to a user DID.

### ✔ Minimal Models

Only necessary metadata is stored:

```ts
StoredObject = { owner, objectId, name, size, createdAt }
User = { wallet, credits }
```

### ✔ Secure Access Control

Download & delete require ownership check.

---

# 📂 Project Structure

```
backend/
│
├─ src/
│  ├─ config/
│  │   └─ env.ts
│  ├─ models/
│  │   ├─ User.ts
│  │   └─ StoredObject.ts
│  ├─ services/
│  │   ├─ storachaClient.ts
│  │   ├─ pricing.ts
│  │   └─ payments.ts
│  ├─ listener/
│  │   └─ deposit.listener.ts
│  ├─ controllers/
│  │   ├─ storacha.controller.ts
│  │   └─ storacha.router.ts
│  ├─ index.ts
│
├─ artifacts/
│   └─ StoragePayments.json
│
├─ .env
├─ package.json
└─ README.md
```

---

# ⚙️ Installation

```bash
git clone <repo>
cd backend
pnpm install
```

---

# 🧪 Development

```bash
pnpm dev
```

# 🏗 Production Build

```bash
pnpm build
pnpm start
```

---

# 🔧 Environment Variables (`.env`)

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/storacha_dev

BASE_RPC=https://rpc.base.org
PAYMENTS_CONTRACT=0xYourStoragePaymentsContractAddress

USDC_ADDRESS=0x...
FST_ADDRESS=0x...
FST_DECIMALS=18

STORACHA_KEY=server-priv-key
STORACHA_PROOF=server-proof
STORACHA_BASE_URL=https://your-mcp.example
STORACHA_SERVICE_KEY=service-key

CREDITS_PER_USD=1000000
CONFIRMATIONS=3

UPLOAD_TEMP_DIR=./temp/uploads
MAX_FILE_SIZE=200000000

# Preview File (used in all API responses)
NEXT_PUBLIC_STORACHA_PREVIEW=/mnt/data/page.tsx
```

---

# 🧵 Storage Flow Overview

### 1️⃣ **User Deposits USDC or FST**

Frontend sends `approve + deposit` to contract:

```solidity
StoragePayments.deposit(token, amountRaw, creditsHint, memo)
```

### 2️⃣ **Backend Deposit Listener**

* Waits for `Deposit` event
* Waits for confirmations
* Converts token → USD → credits
* Updates Mongo `User.credits += credits`

### 3️⃣ **User Uploads a File**

Backend steps:

1. Validate credit balance
2. Deduct credits atomically
3. Compute CID
4. Upload bytes to Storacha
5. Store minimal metadata
6. Return preview path `/mnt/data/page.tsx`

### 4️⃣ **User Downloads / Deletes**

* Backend checks ownership
* Fetches from Storacha (service key) or UCAN
* Streams bytes to user

---

# 📘 API Documentation

## Health

`GET /health`

---

## 📊 Get User Account

`GET /api/storage/account?wallet=0x...`

Response:

```json
{
  "success": true,
  "data": {
    "wallet": "0xabc...",
    "credits": 1234000,
    "preview": "/mnt/data/page.tsx"
  }
}
```

---

## 🧮 Preflight (Quote for Upload)

`GET /api/storage/preflight?size=1000000&ttl=86400&wallet=0x...`

Returns required credits.

---

## 📤 Upload File

`POST /api/storage/upload`
Headers:

```
x-wallet: 0xYourWallet
Content-Type: multipart/form-data
```

Returns:

```json
{
  "success": true,
  "data": {
    "objectId": "bafy...",
    "cid": "bafy...",
    "name": "file.png",
    "size": 12345,
    "preview": "/mnt/data/page.tsx"
  }
}
```

---

## 📁 Upload Directory

`POST /storacha/upload-files?cid=<precomputed-directory-cid>`

---

## 📥 Download

`GET /api/storage/download/:objectId`

Requires:

```
x-wallet: 0xownerWallet
```

---

## 🗑 Delete

`POST /api/storage/delete`

Body:

```json
{ "objectId": "bafy..." }
```

---

## 🔑 UCAN Delegation

`POST /storacha/delegate`

Body:

```json
{
  "recipientDID": "did:key:xyz",
  "deadline": 1233456789,
  "notBefore": 1233000000,
  "baseCapabilities": ["read"],
  "fileCID": "bafy..."
}
```

---

## 💰 Build Deposit Instruction

`POST /storacha/deposit`

Uploads → returns contract calldata instructions for user to sign.

---

## 🧮 Get Quote (alternate)

`GET /storacha/quote?duration=86400&size=10000`

---

## 📚 User History

`GET /storacha/history?userAddress=0x...`

---

## 🔗 Update Transaction Hash

`POST /storacha/update-tx`

Body:

```json
{
  "cid": "bafy...",
  "transactionHash": "0x..."
}
```

---

# 📊 Database Models

### User

```ts
{
  wallet: string;
  credits: number;
  createdAt: Date;
}
```

### StoredObject

```ts
{
  owner: string;
  objectId: string;
  name: string;
  size: number;
  createdAt: Date;
}
```

---

# 🛡 Security Notes

* Replace `x-wallet` with signed nonce authentication in production.
* UCAN delegations should be short-lived.
* Do not trust client-supplied `credits` or memos in deposit tx.
* Validate CID locally to ensure file integrity.
