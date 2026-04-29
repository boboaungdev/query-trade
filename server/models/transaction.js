import crypto from "crypto";
import mongoose from "mongoose";

import { PAYMENT_CURRENCIES, PAYMENT_STATUSES } from "../constants/subscription.js";

const { Schema } = mongoose;

export const TRANSACTION_TYPES = {
  deposit: "deposit",
  transfer: "transfer",
  withdraw: "withdraw",
  subscription: "subscription",
  creatorReward: "creator_reward",
  refund: "refund",
  adjustment: "adjustment",
  spend: "spend",
};

export const TRANSACTION_STATUSES = {
  ...PAYMENT_STATUSES,
  completed: "completed",
};

const transactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUSES),
      required: true,
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true,
      },
    ],
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      index: true,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "user",
      index: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "user",
      index: true,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: "payment",
      unique: true,
      sparse: true,
      index: true,
    },
    walletTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "walletTransaction",
      },
    ],
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "subscription",
      index: true,
    },
    tokenAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amountUsd: {
      type: Number,
      min: 0,
    },
    rateSnapshot: {
      type: Number,
      min: 0,
    },
    payCurrency: {
      type: String,
      enum: Object.keys(PAYMENT_CURRENCIES),
    },
    txHash: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      sparse: true,
    },
    planKey: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 140,
      default: "",
    },
    shareId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
      default: () => crypto.randomBytes(12).toString("hex"),
    },
    note: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    metadata: Schema.Types.Mixed,
    confirmedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

transactionSchema.index({ participants: 1, createdAt: -1 });

export const TransactionModel = mongoose.model(
  "transaction",
  transactionSchema,
);
