import mongoose, { Schema, Document } from "mongoose";

export interface IStoredObject extends Document {
  owner: string;
  objectId: string;
  name: string;
  size: number;
  createdAt: Date;
}

const StoredObjectSchema = new Schema<IStoredObject>({
  owner: { type: String, required: true, index: true },
  objectId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.StoredObject || mongoose.model<IStoredObject>("StoredObject", StoredObjectSchema);
