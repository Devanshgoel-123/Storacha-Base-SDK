import { ethers } from "ethers";
import StoragePaymentsABI from "../../artifacts/StoragePayments.json";
import { ENV } from "../config/env";
import User from "../models/User";
import { computeCreditsFromAmount } from "../services/pricing";

interface IDepositDoc {
  userId?: string;
  payer: string;
  token: string;
  amount: string;
  credits: string;
  txHash: string;
  memo?: string;
  createdAt: Date;
}

/**
 * Temporary embedded deposit model implementation using Mongoose.
 * To keep this file self-contained: define a small Deposit model here.
 * Alternatively you can create src/models/Deposit.ts (similar to previous examples).
 */
import mongoose from "mongoose";
const DepositSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  payer: { type: String, required: true },
  token: { type: String, required: true },
  amount: { type: String, required: true },
  credits: { type: String, required: true },
  txHash: { type: String, unique: true, required: true },
  memo: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const Deposit = mongoose.models.Deposit || mongoose.model("Deposit", DepositSchema);

export async function startDepositListener() {
  const provider = new ethers.JsonRpcProvider(ENV.BASE_RPC);
  const contract = new ethers.Contract(ENV.PAYMENTS_CONTRACT, (StoragePaymentsABI as any).abi, provider);

  console.log("Starting deposit listener for", ENV.PAYMENTS_CONTRACT);

  contract.on("Deposit", async (payer: string, token: string, amount: any, credits: any, memo: string, timestamp: any, txRef: any, event: any) => {
    const txHash = event.transactionHash;
    try {
      // dedupe
      const existing = await Deposit.findOne({ txHash }).exec();
      if (existing) {
        console.log("Deposit already processed:", txHash);
        return;
      }

      // wait for confirmations
      await provider.waitForTransaction(txHash, ENV.CONFIRMATIONS);

      // compute credits server-side (do not trust client)
      const creditsToAddNum = await computeCreditsFromAmount(token, amount.toString());
      const payerLower = String(payer).toLowerCase();

      // find or create user
      let user = await User.findOne({ wallet: payerLower }).exec();
      if (!user) {
        user = await User.create({ wallet: payerLower, credits: 0 });
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
      await User.findByIdAndUpdate(user._id, { $inc: { credits: creditsToAddNum } }).exec();

      console.log(`Credited ${creditsToAddNum} to ${payerLower} (tx ${txHash})`);
    } catch (err) {
      console.error("Deposit event handler error:", err);
    }
  });
}
