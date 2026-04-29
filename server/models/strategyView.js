import mongoose from "mongoose";

const { Schema } = mongoose;

const strategyViewSchema = new Schema(
  {
    strategy: {
      type: Schema.Types.ObjectId,
      ref: "strategy",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

strategyViewSchema.index(
  { strategy: 1, user: 1 },
  { unique: true, name: "unique_strategy_user_view" },
);

export const StrategyViewDB = mongoose.model("strategyView", strategyViewSchema);
