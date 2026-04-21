import mongoose from "mongoose";

const { Schema } = mongoose;

const discountSchema = new Schema(
  {
    isActive: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
    startsAt: Date,
    endsAt: Date,
  },
  { _id: false },
);

const subscriptionPlanSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    amountUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    discount: {
      type: discountSchema,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SubscriptionPlanDB = mongoose.model(
  "subscriptionPlan",
  subscriptionPlanSchema,
);
