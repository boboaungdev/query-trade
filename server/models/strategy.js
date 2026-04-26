import mongoose from "mongoose";
const { Schema } = mongoose;

const strategyIndicatorSchema = new Schema(
  {
    indicator: {
      type: Schema.Types.ObjectId,
      ref: "indicator",
      required: true,
    },

    key: {
      type: String,
      required: true,
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
  { _id: false },
);

const conditionSchema = new Schema({}, { _id: false });

conditionSchema.add({
  logic: {
    type: String,
    enum: ["and", "or"],
  },
  conditions: {
    type: [conditionSchema],
    default: undefined,
  },

  left: {
    type: Schema.Types.Mixed, // "ema_fast" or number
  },
  operator: {
    type: String,
    enum: [">", "<", ">=", "<=", "==", "!=", "crossAbove", "crossBelow"],
  },
  right: {
    type: Schema.Types.Mixed,
  },
});

const riskManagementSchema = new Schema(
  {
    stopLoss: {
      type: Schema.Types.Mixed, // candle | indicator | percent | atr | price
      required: true,
    },
    takeProfit: {
      type: Schema.Types.Mixed, // riskReward | percent | indicator | price
      required: true,
    },
  },
  { _id: false },
);

const logicBlockSchema = new Schema(
  {
    logic: {
      type: String,
      enum: ["and", "or"],
      required: true,
    },

    conditions: {
      type: [conditionSchema],
      required: true,
    },

    riskManagement: {
      type: riskManagementSchema,
      required: true,
    },
  },
  { _id: false },
);

const strategySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    indicators: {
      type: [strategyIndicatorSchema],
    },

    entry: {
      buy: {
        type: logicBlockSchema,
        required: true,
      },

      sell: {
        type: logicBlockSchema,
        required: true,
      },
    },

    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },

    accessType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },

    stats: {
      viewCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      bookmarkCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

strategySchema.index({ user: 1, isPublic: 1, createdAt: -1 });
strategySchema.index({ isPublic: 1, accessType: 1, createdAt: -1 });

export const StrategyDB = mongoose.model("strategy", strategySchema);
