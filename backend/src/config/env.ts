import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: Number(process.env.PORT || 3000),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/storacha_dev",
  BASE_RPC: process.env.BASE_RPC || "https://rpc.base.org",
  PAYMENTS_CONTRACT: process.env.PAYMENTS_CONTRACT || "",
  CONFIRMATIONS: Number(process.env.CONFIRMATIONS || 3),

  USDC_ADDRESS: (process.env.USDC_ADDRESS || "").toLowerCase(),
  FST_ADDRESS: (process.env.FST_ADDRESS || "").toLowerCase(),
  FST_DECIMALS: Number(process.env.FST_DECIMALS || 18),

  STORACHA_KEY: process.env.STORACHA_KEY || "",
  STORACHA_PROOF: process.env.STORACHA_PROOF || "",
  STORACHA_BASE_URL: process.env.STORACHA_BASE_URL || "",
  STORACHA_SERVICE_KEY: process.env.STORACHA_SERVICE_KEY || "",

  CREDITS_PER_USD: Number(process.env.CREDITS_PER_USD || 1000000),
  STORAGE_DEFAULT_TTL_SECONDS: Number(process.env.STORAGE_DEFAULT_TTL_SECONDS || 86400),
  UPLOAD_TEMP_DIR: process.env.UPLOAD_TEMP_DIR || "./temp/uploads",
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE || 200_000_000),

  PREVIEW_LOCAL_PATH: process.env.NEXT_PUBLIC_STORACHA_PREVIEW || "/mnt/data/page.tsx"
};
