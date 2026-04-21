import mongoose from "mongoose";
import {
  PAYMENT_CURRENCIES,
  PAYMENT_STATUSES,
} from "../constants/subscription.js";

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      required: true,
    },
    planSnapshot: {
      key: String,
      name: String,
      originalAmountUsd: Number,
      discountAmountUsd: Number,
      finalAmountUsd: Number,
      durationDays: Number,
      discount: Schema.Types.Mixed,
    },
    amountUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.pending,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["manual"],
      default: "manual",
      required: true,
    },
    providerStatus: String,
    payAddress: String,
    payAmount: Number,
    txHash: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    txFrom: String,
    txBlockNumber: Number,
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payCurrency: {
      type: String,
      enum: Object.keys(PAYMENT_CURRENCIES),
      required: true,
    },
    actuallyPaid: Number,
    rawPayload: Schema.Types.Mixed,
    confirmedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const PaymentDB = mongoose.model("payment", paymentSchema);
