import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  wallet: string;
  credits: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  wallet: { type: String, required: true, unique: true, index: true },
  credits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
