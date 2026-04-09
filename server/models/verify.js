import mongoose from "mongoose";

import { EXPIRE_MINUTE } from "../constants/index.js";

const { Schema } = mongoose;

const verifySchema = new Schema(
  {
    name: { type: String, trim: true },
    username: { type: String },
    email: { type: String, required: true },
    password: { type: String },
    code: { type: String, required: true },
    expiresIn: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + EXPIRE_MINUTE * 60 * 1000),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Auto delete after 15 minutes
verifySchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export const VerifyDB = mongoose.model("verify", verifySchema);
