import mongoose from "mongoose";
const { Schema } = mongoose;

const equityPointSchema = new Schema(
  {
    timestamp: {
      type: Number,
      required: true,
    },
    equity: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const tradeSchema = new Schema(
  {
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    side: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountInUSD: {
      type: Number,
      required: true,
    },
    entryFee: {
      type: Number,
      required: true,
    },
    entryPrice: {
      type: Number,
      required: true,
    },
    entryTime: {
      type: Number,
      required: true,
    },
    stopLoss: {
      type: Number,
      default: null,
    },
    takeProfit: {
      type: Number,
      default: null,
    },
    exitFee: {
      type: Number,
      required: true,
    },
    exitPrice: {
      type: Number,
      required: true,
    },
    exitTime: {
      type: Number,
      required: true,
    },
    exitReason: {
      type: String,
      required: true,
    },
    totalFees: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    pnl: {
      type: Number,
      required: true,
    },
    pnlPercent: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const backtestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    strategy: {
      type: Schema.Types.ObjectId,
      ref: "strategy",
      required: true,
      index: true,
    },
    exchange: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    timeframe: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    candlesCount: {
      type: Number,
      required: true,
    },
    initialBalance: {
      type: Number,
      required: true,
    },
    amountPerTrade: {
      type: Number,
      required: true,
    },
    entryFeeRate: {
      type: Number,
      required: true,
      default: 0,
    },
    exitFeeRate: {
      type: Number,
      required: true,
      default: 0,
    },
    hedgeMode: {
      type: Boolean,
      default: false,
    },
    result: {
      startTime: {
        type: Number,
        required: true,
      },
      endTime: {
        type: Number,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      initialBalance: {
        type: Number,
        required: true,
      },
      finalBalance: {
        type: Number,
        required: true,
      },
      totalPnL: {
        type: Number,
        required: true,
      },
      roi: {
        type: Number,
        required: true,
      },
      totalTrades: {
        type: Number,
        required: true,
      },
      wins: {
        type: Number,
        required: true,
      },
      losses: {
        type: Number,
        required: true,
      },
      winRate: {
        type: Number,
        required: true,
      },
      grossProfit: {
        type: Number,
        required: true,
      },
      grossLoss: {
        type: Number,
        required: true,
      },
      profitFactor: {
        type: Number,
        required: true,
      },
      payoffRatio: {
        type: Number,
        required: true,
      },
      averageWin: {
        type: Number,
        required: true,
      },
      averageLoss: {
        type: Number,
        required: true,
      },
      expectancy: {
        type: Number,
        required: true,
      },
      averageTradePnL: {
        type: Number,
        required: true,
      },
      averageTradeDuration: {
        type: Number,
        required: true,
      },
      longestTradeDuration: {
        type: Number,
        required: true,
      },
      shortestTradeDuration: {
        type: Number,
        required: true,
      },
      maxWin: {
        type: Number,
        required: true,
      },
      maxLoss: {
        type: Number,
        required: true,
      },
      maxWinStreak: {
        type: Number,
        required: true,
      },
      maxLossStreak: {
        type: Number,
        required: true,
      },
      streakInsight: {
        type: String,
        required: true,
        trim: true,
      },
      totalFees: {
        type: Number,
        required: true,
      },
      averageTradeFee: {
        type: Number,
        required: true,
      },
      maxDrawdown: {
        type: Number,
        required: true,
      },
      maxDrawdownPercent: {
        type: Number,
        required: true,
      },
      recoveryFactor: {
        type: Number,
        required: true,
      },
      equityCurves: {
        type: [equityPointSchema],
        default: [],
      },
      trades: {
        type: [tradeSchema],
        default: [],
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

backtestSchema.index({ createdAt: -1 });
backtestSchema.index({ user: 1, createdAt: -1 });

export const BacktestDB = mongoose.model("backtest", backtestSchema);
