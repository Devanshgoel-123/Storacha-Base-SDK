"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDepositTxData = buildDepositTxData;
const ethers_1 = require("ethers");
const StoragePayments_json_1 = __importDefault(require("../../artifacts/StoragePayments.json"));
const env_1 = require("../config/env");
function buildDepositTxData(token, amountRaw, credits = "0", memo = "") {
    const iface = new ethers_1.ethers.Interface(StoragePayments_json_1.default.abi);
    const data = iface.encodeFunctionData("deposit", [token, amountRaw, credits, memo]);
    return { to: env_1.ENV.PAYMENTS_CONTRACT, data, value: "0x0" };
}
