import mongoose from "mongoose";

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
    lastWalletTransaction: {
      type: Schema.Types.ObjectId,
      ref: "walletTransaction",
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
