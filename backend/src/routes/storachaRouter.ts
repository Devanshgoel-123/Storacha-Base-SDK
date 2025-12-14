import { Router } from "express";
import {
  createUCANDelegation,
  deposit,
  getQuoteForFileUpload,
  getUserUploadHistory,
  uploadFile,
  uploadFiles,
} from "../controllers/storacha.controller";
export const storachaRouter = Router();

storachaRouter.post("/createUCANDelegation", createUCANDelegation);
storachaRouter.post("/deposit", deposit);
storachaRouter.post("/uploadFile", uploadFile);
storachaRouter.post("/uploadFiles", uploadFiles);
storachaRouter.get("/getQuoteForFileUpload", getQuoteForFileUpload);
storachaRouter.get("/getUserUploadHistory", getUserUploadHistory);
