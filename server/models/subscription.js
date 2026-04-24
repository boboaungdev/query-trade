import mongoose from "mongoose";
import { TOKEN_TRANSACTION_TYPES } from "../constants/subscription.js";

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
      enum: ["token"],
    },
    providerPaymentId: String,
    lastTransaction: {
      type: Schema.Types.ObjectId,
      ref: "tokenTransaction",
    },
    lastPayment: {
      type: Schema.Types.ObjectId,
      ref: "payment",
    },
    lastTokenAmount: Number,
    lastTokenTransactionType: {
      type: String,
      enum: Object.values(TOKEN_TRANSACTION_TYPES),
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
