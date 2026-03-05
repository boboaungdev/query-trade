import mongoose from "mongoose";

const { Schema } = mongoose;

const strategySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    indicators: [],

    entry: Schema.Types.Mixed,
    exit: Schema.Types.Mixed,

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true },
);

export const StrategyDB = mongoose.model("strategy", strategySchema);
