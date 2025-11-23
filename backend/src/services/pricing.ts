import axios from "axios";
import { ethers } from "ethers";
import { ENV } from "../config/env";

export async function tokenAmountToUsd(tokenAddress: string, amountRaw: string) {
  const token = tokenAddress.toLowerCase();
  if (token === ENV.USDC_ADDRESS) {
    return Number(ethers.formatUnits(amountRaw, 6));
  }
  if (token === ENV.FST_ADDRESS) {
    const human = Number(ethers.formatUnits(amountRaw, ENV.FST_DECIMALS));
    const fallback = Number(process.env.FST_USD_PRICE || 0);
    if (fallback > 0) return human * fallback;
    try {
      const cgId = process.env.FST_COINGECKO_ID;
      if (!cgId) return human * fallback;
      const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
      const price = r.data?.[cgId]?.usd || fallback;
      return human * (price || fallback);
    } catch {
      return human * fallback;
    }
  }
  return 0;
}

export async function computeCreditsFromAmount(tokenAddress: string, amountRaw: string) {
  const usd = await tokenAmountToUsd(tokenAddress, amountRaw);
  const credits = Math.max(0, Math.floor(usd * ENV.CREDITS_PER_USD));
  return Math.min(credits, Number.MAX_SAFE_INTEGER);
}

/**
 * requiredCredits = ceil((sizeBytes * retentionSeconds) / 1e6)
 */
export function computeUploadRequiredCredits(sizeBytes: number, retentionSeconds: number): number {
  const raw = BigInt(sizeBytes) * BigInt(retentionSeconds);
  const scaled = (raw + BigInt(1_000_000 - 1)) / BigInt(1_000_000);
  const v = Number(scaled);
  if (!Number.isSafeInteger(v)) throw new Error("required credits overflow");
  return v;
}
