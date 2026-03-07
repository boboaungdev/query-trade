import { calculateIndicators } from "./calculateIndicators.js";
import { calculateCondition } from "./calculateCondition.js";
import { openPosition, closePosition } from "./tradeExecutor.js";
import { calculateMetrics } from "./calculateMetrics.js";
import { fetchMarketData } from "./fetchMarketData.js";

export const backtestEngine = async ({
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
}) => {
  // Fetch market data and fee rates
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

  // Pre-calculate all indicators for the entire dataset
  const indicatorsData = calculateIndicators({
    candles,
    indicators: strategy.indicators,
  });

  // Start backtest loop
  let balance = initialBalance;
  let position = null;
  const trades = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const price = candle.close;

    const context = {
      candle,
      indicators: Object.fromEntries(
        Object.entries(indicatorsData).map(([name, arr]) => [name, arr[i]]),
      ),
    };

    // If any indicator is not ready yet, skip this candle
    if (Object.values(context.indicators).some((v) => v == null)) {
      continue;
    }

    // ENTRY
    if (!position) {
      const buySignal = calculateCondition({
        block: strategy.entry?.buy,
        context,
      });
      const sellSignal = calculateCondition({
        block: strategy.entry?.sell,
        context,
      });

      if (buySignal || sellSignal) {
        const side = buySignal ? "buy" : "sell";

        position = openPosition({
          symbol,
          side,
          price,
          amountPerTrade,
          entryFeeRate,
          timestamp: candle.timestamp,
        });

        balance -= position.entryFee;
      }
    }

    // EXIT
    if (position) {
      const exitBlock =
        position.side === "buy" ? strategy.exit?.buy : strategy.exit?.sell;

      const shouldExit = calculateCondition({ block: exitBlock, context });

      if (shouldExit) {
        const { trade, pnl } = closePosition({
          position,
          price,
          exitFeeRate,
          timestamp: candle.timestamp,
        });

        balance += pnl;
        trades.push(trade);
        position = null;
      }
    }
  }

  return calculateMetrics({
    initialBalance,
    balance,
    trades,
  });
};
