"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenAmountToUsd = tokenAmountToUsd;
exports.computeCreditsFromAmount = computeCreditsFromAmount;
exports.computeUploadRequiredCredits = computeUploadRequiredCredits;
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const env_1 = require("../config/env");
async function tokenAmountToUsd(tokenAddress, amountRaw) {
    const token = tokenAddress.toLowerCase();
    if (token === env_1.ENV.USDC_ADDRESS) {
        return Number(ethers_1.ethers.formatUnits(amountRaw, 6));
    }
    if (token === env_1.ENV.FST_ADDRESS) {
        const human = Number(ethers_1.ethers.formatUnits(amountRaw, env_1.ENV.FST_DECIMALS));
        const fallback = Number(process.env.FST_USD_PRICE || 0);
        if (fallback > 0)
            return human * fallback;
        try {
            const cgId = process.env.FST_COINGECKO_ID;
            if (!cgId)
                return human * fallback;
            const r = await axios_1.default.get(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
            const price = r.data?.[cgId]?.usd || fallback;
            return human * (price || fallback);
        }
        catch {
            return human * fallback;
        }
    }
    return 0;
}
async function computeCreditsFromAmount(tokenAddress, amountRaw) {
    const usd = await tokenAmountToUsd(tokenAddress, amountRaw);
    const credits = Math.max(0, Math.floor(usd * env_1.ENV.CREDITS_PER_USD));
    return Math.min(credits, Number.MAX_SAFE_INTEGER);
}
/**
 * requiredCredits = ceil((sizeBytes * retentionSeconds) / 1e6)
 */
function computeUploadRequiredCredits(sizeBytes, retentionSeconds) {
    const raw = BigInt(sizeBytes) * BigInt(retentionSeconds);
    const scaled = (raw + BigInt(1000000 - 1)) / BigInt(1000000);
    const v = Number(scaled);
    if (!Number.isSafeInteger(v))
        throw new Error("required credits overflow");
    return v;
}
