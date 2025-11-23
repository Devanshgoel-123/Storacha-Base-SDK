import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { ENV } from "./config/env";
import storageRouter from "./controllers/storage.controller";
import storachaRouter from "./controllers/storacha.controller";
import { startDepositListener } from "./listener/deposit.listener";

async function main() {
  await mongoose.connect(ENV.MONGODB_URI);
  console.log("MongoDB connected");

  const app = express();
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(storageRouter);
  // storacha controller exposes several endpoints — mount them under /storacha
  app.use(storachaRouter as any); // storacha.controller exports named handlers; you can create a router file to mount properly

  app.get("/", (_, res) => res.send("Storacha backend"));

  app.listen(ENV.PORT, async () => {
    console.log(`Server listening on ${ENV.PORT}`);
    startDepositListener().catch(e => console.error("Listener failed:", e));
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
