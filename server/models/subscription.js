import mongoose from "mongoose";
import {
  PAYMENT_CURRENCIES,
} from "../constants/subscription.js";

const { Schema } = mongoose;

const subscriptionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      default: "free",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "pending"],
      default: "active",
      required: true,
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    provider: {
      type: String,
      enum: ["manual"],
    },
    providerPaymentId: String,
    lastPayment: {
      type: Schema.Types.ObjectId,
      ref: "payment",
    },
    lastPaymentAmountUsd: Number,
    lastPaymentCurrency: {
      type: String,
      enum: Object.keys(PAYMENT_CURRENCIES),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SubscriptionDB = mongoose.model(
  "subscription",
  subscriptionSchema,
);
