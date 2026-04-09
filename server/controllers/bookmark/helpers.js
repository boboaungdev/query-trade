import { resError } from "../../utils/response.js";
import { StrategyDB } from "../../models/strategy.js";
import { BacktestDB } from "../../models/backtest.js";

const targetModelMap = {
  strategy: StrategyDB,
  backtest: BacktestDB,
};

export const getTargetModel = (targetType) => {
  const model = targetModelMap[targetType];

  if (!model) {
    throw resError(400, "Invalid target type!");
  }

  return model;
};

export const getBookmarkTargetName = (targetType, targetDoc) => {
  if (targetType === "backtest") {
    const symbol = targetDoc?.symbol?.trim() || "Backtest"
    const timeframe = targetDoc?.timeframe?.trim()
    return timeframe ? `${symbol} ${timeframe}` : symbol
  }

  return targetDoc?.name?.trim() || `${targetType} bookmark`
};
