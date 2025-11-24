"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDepositListener = startDepositListener;
const ethers_1 = require("ethers");
const StoragePayments_json_1 = __importDefault(require("../../artifacts/StoragePayments.json"));
const env_1 = require("../config/env");
const User_1 = __importDefault(require("../models/User"));
const pricing_1 = require("../services/pricing");
/**
 * Temporary embedded deposit model implementation using Mongoose.
 * To keep this file self-contained: define a small Deposit model here.
 * Alternatively you can create src/models/Deposit.ts (similar to previous examples).
 */
const mongoose_1 = __importDefault(require("mongoose"));
const DepositSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
    payer: { type: String, required: true },
    token: { type: String, required: true },
    amount: { type: String, required: true },
    credits: { type: String, required: true },
    txHash: { type: String, unique: true, required: true },
    memo: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const Deposit = mongoose_1.default.models.Deposit || mongoose_1.default.model("Deposit", DepositSchema);
async function startDepositListener() {
    const provider = new ethers_1.ethers.JsonRpcProvider(env_1.ENV.BASE_RPC);
    const contract = new ethers_1.ethers.Contract(env_1.ENV.PAYMENTS_CONTRACT, StoragePayments_json_1.default.abi, provider);
    console.log("Starting deposit listener for", env_1.ENV.PAYMENTS_CONTRACT);
    contract.on("Deposit", async (payer, token, amount, credits, memo, timestamp, txRef, event) => {
        const txHash = event.transactionHash;
        try {
            // dedupe
            const existing = await Deposit.findOne({ txHash }).exec();
            if (existing) {
                console.log("Deposit already processed:", txHash);
                return;
            }
            // wait for confirmations
            await provider.waitForTransaction(txHash, env_1.ENV.CONFIRMATIONS);
            // compute credits server-side (do not trust client)
            const creditsToAddNum = await (0, pricing_1.computeCreditsFromAmount)(token, amount.toString());
            const payerLower = String(payer).toLowerCase();
            // find or create user
            let user = await User_1.default.findOne({ wallet: payerLower }).exec();
            if (!user) {
                user = await User_1.default.create({ wallet: payerLower, credits: 0 });
            }
            // record deposit
            await Deposit.create({
                userId: user._id,
                payer: payerLower,
                token,
                amount: amount.toString(),
                credits: String(creditsToAddNum),
                txHash,
                memo: memo || ""
            });
            // atomic increment user credits
            await User_1.default.findByIdAndUpdate(user._id, { $inc: { credits: creditsToAddNum } }).exec();
            console.log(`Credited ${creditsToAddNum} to ${payerLower} (tx ${txHash})`);
        }
        catch (err) {
            console.error("Deposit event handler error:", err);
        }
    });
}
