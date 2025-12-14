import { Router } from "express";
import {
  getHealth,
  getAccount,
  getPreflight,
  uploadFile,
  downloadFile,
  deleteFile,
  multerUpload,
} from "../controllers/storage.controller";

export const storageRouter = Router();

storageRouter.get("/health", getHealth);
storageRouter.get("/account", getAccount);
storageRouter.get("/preflight", getPreflight);
storageRouter.post("/upload", multerUpload.single("file"), uploadFile);
storageRouter.get("/download/:objectId", downloadFile);
storageRouter.post("/delete", deleteFile);

