import { resJson } from "../../utils/response.js";
import { fetchMarketData } from "../../services/backtest/fetchMarketData.js";
import { backtestEngine } from "../../services/backtest/backtestEngine.js";

export const runBacktest = async (req, res, next) => {
  try {
    const {
      exchange,
      symbol,
      timeframe,
      startTime,
      endTime,
      amountPerTrade,
      initialBalance,
      marketType,
      entryOrderType,
      exitOrderType,
      strategy,
    } = req.body;

    const { candles, entryFeeRate, exitFeeRate } = await fetchMarketData({
      exchange,
      symbol,
      timeframe,
      marketType,
      startTime,
      endTime,
      entryOrderType,
      exitOrderType,
    });

    const backtest = backtestEngine({
      candles,
      strategy,
      initialBalance,
      amountPerTrade,
      entryFeeRate,
      exitFeeRate,
    });

    return resJson(res, 200, "Backtest completed.", { backtest });
  } catch (error) {
    next(error);
  }
};
