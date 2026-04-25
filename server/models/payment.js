import mongoose from "mongoose";
import {
  PAYMENT_PURPOSES,
  PAYMENT_CURRENCIES,
  PAYMENT_PROVIDERS,
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
    requestedAmountUsdt: {
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
      enum: Object.values(PAYMENT_PROVIDERS),
      default: PAYMENT_PROVIDERS.manual,
      required: true,
    },
    providerStatus: String,
    payAddress: String,
    payCurrencyAmount: Number,
    txHash: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    providerReference: {
      type: String,
      trim: true,
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
    confirmedAmountUsdt: Number,
    rawPayload: Schema.Types.Mixed,
    confirmedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const PaymentModel = mongoose.model("payment", paymentSchema);
