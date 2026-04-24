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
      maxlength: 40,
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
      maxlength: 20,
      unique: true,
      index: true,
    },
    amountToken: {
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
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],
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
