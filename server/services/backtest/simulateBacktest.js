import { calculateMetrics } from "./calculateMetrics.js";
import { evaluateCondition } from "./evaluateConditions.js";
import { closePosition, openPosition } from "./tradeExecutor.js";
import { buildRiskTargets, getRiskExit } from "./riskManagement.js";

const createContext = ({ candles, indicatorValues, index }) => ({
  candle: candles[index],
  indicators: indicatorValues[index] || {},
});

const hasEnoughBalance = ({ balance, amountPerTrade }) =>
  balance >= amountPerTrade;

const hasValidRiskTargets = ({ side, entryPrice, stopLoss, takeProfit }) => {
  if (stopLoss == null || takeProfit == null) {
    return false;
  }

  if (side === "buy") {
    return stopLoss < entryPrice && takeProfit > entryPrice;
  }

  if (side === "sell") {
    return stopLoss > entryPrice && takeProfit < entryPrice;
  }

  return false;
};

const maybeOpenPosition = ({
  side,
  strategyBlock,
  symbol,
  candle,
  candles,
  index,
  context,
  previousContext,
  amountPerTrade,
  balance,
  entryFeeRate,
}) => {
  if (!hasEnoughBalance({ balance, amountPerTrade })) {
    return null;
  }

  if (
    !evaluateCondition({
      condition: strategyBlock,
      context,
      previousContext,
    })
  ) {
    return null;
  }

  const entryPrice = candle.close;
  const riskTargets = buildRiskTargets({
    side,
    entryPrice,
    riskManagement: strategyBlock.riskManagement,
    context,
    previousContext,
    candles,
    index,
  });

  if (
    !hasValidRiskTargets({
      side,
      entryPrice,
      stopLoss: riskTargets.stopLoss,
      takeProfit: riskTargets.takeProfit,
    })
  ) {
    return null;
  }

  return openPosition({
    symbol,
    side,
    price: entryPrice,
    amountPerTrade,
    entryFeeRate,
    timestamp: candle.timestamp,
    stopLoss: riskTargets.stopLoss,
    takeProfit: riskTargets.takeProfit,
  });
};

export const simulateBacktest = ({
  symbol,
  candles,
  strategy,
  indicatorValues,
  initialBalance,
  amountPerTrade,
  entryFeeRate,
  exitFeeRate,
  hedgeMode,
}) => {
  const trades = [];
  let balance = initialBalance;
  let usedCapital = 0;
  const positions = {
    buy: null,
    sell: null,
  };

  const getAvailableBalance = () => balance - usedCapital;

  const openSidePosition = (side, nextPosition) => {
    positions[side] = nextPosition;
    usedCapital += nextPosition.amountInUSD;
  };

  const closeSidePosition = ({ side, price, timestamp, reason }) => {
    const position = positions[side];

    if (!position) {
      return;
    }

    const { trade, pnl } = closePosition({
      position,
      price,
      exitFeeRate,
      timestamp,
      reason,
    });

    trades.push(trade);
    balance += pnl;
    usedCapital -= position.amountInUSD;
    positions[side] = null;
  };

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const context = createContext({ candles, indicatorValues, index });
    const previousContext = createContext({
      candles,
      indicatorValues,
      index: index - 1,
    });

    for (const side of ["buy", "sell"]) {
      const position = positions[side];

      if (!position) {
        continue;
      }

      const riskExit = getRiskExit({ position, candle });

      if (riskExit) {
        closeSidePosition({
          side,
          price: riskExit.price,
          timestamp: candle.timestamp,
          reason: riskExit.reason,
        });
      }
    }

    if (!hedgeMode) {
      const activeSide = positions.buy ? "buy" : positions.sell ? "sell" : null;

      if (activeSide) {
        const oppositeBlock =
          activeSide === "buy" ? strategy.entry.sell : strategy.entry.buy;

        const hasOppositeSignal = evaluateCondition({
          condition: oppositeBlock,
          context,
          previousContext,
        });

        if (hasOppositeSignal) {
          closeSidePosition({
            side: activeSide,
            price: candle.close,
            timestamp: candle.timestamp,
            reason: "signal",
          });
        }
      }

      if (positions.buy || positions.sell) {
        continue;
      }

      const nextBuyPosition = maybeOpenPosition({
        side: "buy",
        strategyBlock: strategy.entry.buy,
        symbol,
        candle,
        candles,
        index,
        context,
        previousContext,
        amountPerTrade,
        balance: getAvailableBalance(),
        entryFeeRate,
      });

      const nextSellPosition = maybeOpenPosition({
        side: "sell",
        strategyBlock: strategy.entry.sell,
        symbol,
        candle,
        candles,
        index,
        context,
        previousContext,
        amountPerTrade,
        balance: getAvailableBalance(),
        entryFeeRate,
      });

      if (nextBuyPosition && nextSellPosition) {
        continue;
      }

      if (nextBuyPosition) {
        openSidePosition("buy", nextBuyPosition);
      } else if (nextSellPosition) {
        openSidePosition("sell", nextSellPosition);
      }

      continue;
    }

    for (const side of ["buy", "sell"]) {
      if (positions[side]) {
        continue;
      }

      const nextPosition = maybeOpenPosition({
        side,
        strategyBlock:
          side === "buy" ? strategy.entry.buy : strategy.entry.sell,
        symbol,
        candle,
        candles,
        index,
        context,
        previousContext,
        amountPerTrade,
        balance: getAvailableBalance(),
        entryFeeRate,
      });

      if (nextPosition) {
        openSidePosition(side, nextPosition);
      }
    }
  }

  for (const side of ["buy", "sell"]) {
    const position = positions[side];

    if (!position) {
      continue;
    }

    const lastCandle = candles[candles.length - 1];
    closeSidePosition({
      side,
      price: lastCandle.close,
      timestamp: lastCandle.timestamp,
      reason: "endOfBacktest",
    });
  }

  const startTime = candles[0]?.timestamp ?? null;
  const endTime = candles[candles.length - 1]?.timestamp ?? null;
  const duration =
    typeof startTime === "number" && typeof endTime === "number"
      ? Math.max(0, endTime - startTime)
      : 0;

  return {
    startTime,
    endTime,
    duration,
    ...calculateMetrics({
      initialBalance,
      balance,
      trades,
    }),
  };
};
