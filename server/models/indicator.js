import mongoose from "mongoose";
const { Schema } = mongoose;

const indicatorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["trend", "momentum", "volatility", "volume", "support_resistance"],
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["open", "high", "low", "close", "volume"],
      default: "close",
    },

    params: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const IndicatorDB = mongoose.model("indicator", indicatorSchema);
