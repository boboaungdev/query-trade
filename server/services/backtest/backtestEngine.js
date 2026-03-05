import { calculateIndicators } from "./calculateIndicators.js";
import { evaluateConditions } from "./conditionEvaluator.js";
import { openPosition, closePosition } from "./tradeExecutor.js";
import { calculateMetrics } from "./calculateMetrics.js";

export const backtestEngine = ({
  candles,
  strategy,
  initialBalance,
  amountPerTrade,
  entryFeeRate,
  exitFeeRate,
}) => {
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
      const buySignal = evaluateConditions({
        block: strategy.entry?.buy,
        context,
      });
      const sellSignal = evaluateConditions({
        block: strategy.entry?.sell,
        context,
      });

      if (buySignal || sellSignal) {
        const type = buySignal ? "buy" : "sell";

        position = openPosition({
          type,
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
        position.type === "buy" ? strategy.exit?.buy : strategy.exit?.sell;

      const shouldExit = evaluateConditions({ block: exitBlock, context });

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
