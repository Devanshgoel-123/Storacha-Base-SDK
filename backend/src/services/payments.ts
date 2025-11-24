import { ethers } from "ethers";
import StoragePaymentsABI from "../../artifacts/StoragePayments.json";
import { ENV } from "../config/env";

export function buildDepositTxData(token: string, amountRaw: string, credits = "0", memo = "") {
  const iface = new ethers.Interface((StoragePaymentsABI as any).abi);
  const data = iface.encodeFunctionData("deposit", [token, amountRaw, credits, memo]);
  return { to: ENV.PAYMENTS_CONTRACT, data, value: "0x0" };
}
