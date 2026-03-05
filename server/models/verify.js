import mongoose from "mongoose";
const { Schema } = mongoose;

const verifySchema = new Schema(
  {
    name: { type: String, trim: true },
    username: { type: String },
    email: { type: String, require: true },
    password: { type: String },
    code: { type: String, require: true },
    expireAt: { type: Date, require: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const VerifyDB = mongoose.model("verify", verifySchema);
