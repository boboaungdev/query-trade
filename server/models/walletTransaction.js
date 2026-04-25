import mongoose from "mongoose";

import { WALLET_TRANSACTION_TYPES } from "../constants/subscription.js";

const { Schema } = mongoose;

const walletTransactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(WALLET_TRANSACTION_TYPES),
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    planKey: {
      type: String,
      trim: true,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: "payment",
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 140,
      default: "",
    },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const WalletTransactionModel = mongoose.model(
  "walletTransaction",
  walletTransactionSchema,
);
