import { BacktestDB } from "../../models/backtest.js";
import { StrategyDB } from "../../models/strategy.js";
import { UserDB } from "../../models/user.js";
import { ensureStrategyAccessible } from "../../services/strategy/access.js";
import { resError, resJson } from "../../utils/response.js";
import { fetchOHLCV } from "../../services/backtest/fetchOHLCV.js";
import { simulateBacktest } from "../../services/backtest/simulateBacktest.js";
import {
  calculateIndicators,
  calculateRiskIndicators,
} from "../../services/backtest/calculateIndicators.js";
import { extractRequiredAtrPeriods } from "../../utils/strategyIndicators.js";

export const createBacktest = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      exchange,
      symbol,
      timeframe,
      startDate,
      endDate,
      amountPerTrade,
      initialBalance,
      entryFeeRate,
      exitFeeRate,
      strategyId,
      hedgeMode,
    } = req.body;

    const strategy = await StrategyDB.findById(strategyId)
      .populate("indicators.indicator")
      .lean();

    if (!strategy) {
      throw resError(404, "Strategy not found!");
    }

    ensureStrategyAccessible(strategy, user._id);

    const candles = await fetchOHLCV({
      exchange,
      symbol,
      timeframe,
      startDate,
      endDate,
    });

    if (candles.length < 2) {
      throw resError(400, "Not enough candle data to run backtest!");
    }

    const indicatorValues = calculateIndicators({
      candles,
      indicators: strategy.indicators,
    });
    const riskIndicatorValues = calculateRiskIndicators({
      candles,
      atrPeriods: extractRequiredAtrPeriods(strategy),
    });

    const result = simulateBacktest({
      symbol,
      candles,
      indicatorValues,
      riskIndicatorValues,
      strategy,
      initialBalance,
      amountPerTrade,
      entryFeeRate,
      exitFeeRate,
      hedgeMode,
    });

    const backtest = await BacktestDB.create({
      user: user._id,
      strategy: strategy._id,
      exchange,
      hedgeMode,
      candlesCount: candles.length,
      symbol,
      timeframe,
      startDate,
      endDate,
      initialBalance,
      amountPerTrade,
      entryFeeRate,
      exitFeeRate,
      result,
    });

    await UserDB.updateOne(
      { _id: user._id },
      { $inc: { "stats.backtestCount": 1 } },
    );

    await StrategyDB.updateOne(
      { _id: strategy._id },
      { $inc: { "stats.viewCount": 1 } },
    );

    const savedBacktest = await BacktestDB.findById(backtest._id)
      .populate("strategy", "name description")
      .lean();

    if (!savedBacktest) {
      throw resError(500, "Backtest saved but could not be loaded!");
    }

    return resJson(res, 201, "Backtest completed successfully.", {
      backtest: savedBacktest,
    });
  } catch (error) {
    next(error);
  }
};
