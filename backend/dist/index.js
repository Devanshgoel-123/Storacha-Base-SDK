"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./config/env");
const storage_controller_1 = __importDefault(require("./controllers/storage.controller"));
const storacha_controller_1 = __importDefault(require("./controllers/storacha.controller"));
const deposit_listener_1 = require("./listener/deposit.listener");
async function main() {
    await mongoose_1.default.connect(env_1.ENV.MONGODB_URI);
    console.log("MongoDB connected");
    const app = (0, express_1.default)();
    app.use(body_parser_1.default.json({ limit: "50mb" }));
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.use(storage_controller_1.default);
    // storacha controller exposes several endpoints — mount them under /storacha
    app.use(storacha_controller_1.default); // storacha.controller exports named handlers; you can create a router file to mount properly
    app.get("/", (_, res) => res.send("Storacha backend"));
    app.listen(env_1.ENV.PORT, async () => {
        console.log(`Server listening on ${env_1.ENV.PORT}`);
        (0, deposit_listener_1.startDepositListener)().catch(e => console.error("Listener failed:", e));
    });
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
