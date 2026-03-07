import { resJson } from "../../utils/response.js";
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

    const backtest = await backtestEngine({
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
    });

    return resJson(res, 200, "Backtest completed.", { backtest });
  } catch (error) {
    next(error);
  }
};
