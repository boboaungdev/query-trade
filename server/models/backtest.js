// import mongoose from "mongoose";
// const { Schema } = mongoose;

// const backtestSchema = new Schema(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: "user",
//       required: true,
//       index: true,
//     },

//     strategy: {
//       type: String,
//       required: true,
//     },

//     symbol: {
//       type: String,
//       required: true,
//       index: true,
//     },

//     interval: {
//       type: String,
//       required: true,
//     },

//     parameters: {
//       type: Object,
//       required: true,
//     },

//     result: {
//       totalTrades: Number,
//       totalProfit: Number,
//       winRate: Number,
//       maxDrawdown: Number,
//       sharpeRatio: Number,
//     },

//     status: {
//       type: String,
//       enum: ["running", "completed", "failed"],
//       default: "completed",
//     },
//   },

//   { timestamps: true },
// );

// backtestSchema.index({ createdAt: -1 });

// export const BacktestDB = mongoose.model("backtest", backtestSchema);
