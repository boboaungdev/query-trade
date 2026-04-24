import mongoose from "mongoose";
import {
  PAYMENT_PURPOSES,
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
    purpose: {
      type: String,
      enum: Object.values(PAYMENT_PURPOSES),
      default: PAYMENT_PURPOSES.tokenTopup,
      required: true,
    },
    planSnapshot: {
      key: String,
      name: String,
      originalAmountToken: Number,
      discountAmountToken: Number,
      finalAmountToken: Number,
      durationDays: Number,
      discount: Schema.Types.Mixed,
    },
    amountUsdt: {
      type: Number,
      required: true,
      min: 0,
    },
    tokenAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    rateSnapshot: {
      type: Number,
      required: true,
      min: 1,
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
    payAmountUsdt: Number,
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
