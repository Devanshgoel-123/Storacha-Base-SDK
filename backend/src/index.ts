import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { ENV } from "./config/env";
import { storageRouter } from "./routes/storageRouter";
import { storachaRouter } from "./routes/storachaRouter";
import { startDepositListener } from "./listener/deposit.listener";

const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/v1/storage", storageRouter);
app.use("/api/v1/storacha", storachaRouter);

async function main() {
  await mongoose.connect(ENV.MONGODB_URI);
  console.log("MongoDB connected");

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
