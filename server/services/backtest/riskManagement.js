const getNestedValue = (target, path) => {
  if (!target || !path) return undefined;

  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, target);
};

const resolveIndicatorValue = (indicatorKey, context) =>
  getNestedValue(context?.indicators, indicatorKey) ?? null;

const aggregateValues = ({ values, aggregation }) => {
  if (!values.length) return null;

  switch (aggregation) {
    case "single":
      return values.length === 1 ? values[0] : null;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "average":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    default:
      return null;
  }
};

const resolveCandlePrice = ({ rule, context, previousContext }) => {
  const sourceContext =
    rule.reference === "previous" ? previousContext : context;

  return sourceContext?.candle?.[rule.price] ?? null;
};

const resolveStopLossCandleWindowPrice = ({ side, rule, candles, index }) => {
  if (!Array.isArray(candles) || index == null) {
    return null;
  }

  const previousCandles = rule.previousCandles;
  const aggregation = rule.aggregation;

  if (
    !Number.isInteger(previousCandles) ||
    previousCandles < 0 ||
    typeof aggregation !== "string"
  ) {
    return null;
  }

  const priceField = side === "buy" ? "low" : "high";
  const startIndex = previousCandles === 0 ? index : index - previousCandles;
  const endIndex = previousCandles === 0 ? index : index - 1;

  if (startIndex < 0 || endIndex < startIndex) {
    return null;
  }

  const values = candles
    .slice(startIndex, endIndex + 1)
    .map((candle) => candle?.[priceField])
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  return aggregateValues({ values, aggregation });
};

const resolveStopLossPrice = ({
  side,
  entryPrice,
  rule,
  context,
  previousContext,
  candles,
  index,
}) => {
  if (!rule) return null;

  if (rule.type === "candle") {
    if ("previousCandles" in rule || "aggregation" in rule) {
      return resolveStopLossCandleWindowPrice({ side, rule, candles, index });
    }

    return resolveCandlePrice({ rule, context, previousContext });
  }

  if (rule.type === "indicator") {
    return resolveIndicatorValue(rule.indicator, context);
  }

  if (rule.type === "percent") {
    return side === "buy"
      ? entryPrice * (1 - rule.value / 100)
      : entryPrice * (1 + rule.value / 100);
  }

  if (rule.type === "price") {
    return rule.value;
  }

  if (rule.type === "atr") {
    const atrValue = resolveIndicatorValue(`atr_${rule.period}`, context);
    if (atrValue == null) return null;

    return side === "buy"
      ? entryPrice - atrValue * rule.multiplier
      : entryPrice + atrValue * rule.multiplier;
  }

  return null;
};

const resolveTakeProfitPrice = ({
  side,
  entryPrice,
  stopLossPrice,
  rule,
  context,
  previousContext,
}) => {
  if (!rule) return null;

  if (rule.type === "riskReward") {
    if (stopLossPrice == null) return null;

    const risk = Math.abs(entryPrice - stopLossPrice);
    return side === "buy"
      ? entryPrice + risk * rule.ratio
      : entryPrice - risk * rule.ratio;
  }

  if (rule.type === "percent") {
    return side === "buy"
      ? entryPrice * (1 + rule.value / 100)
      : entryPrice * (1 - rule.value / 100);
  }

  if (rule.type === "price") {
    return rule.value;
  }

  if (rule.type === "indicator") {
    return resolveIndicatorValue(rule.indicator, context);
  }

  return null;
};

export const buildRiskTargets = ({
  side,
  entryPrice,
  riskManagement,
  context,
  previousContext,
  candles,
  index,
}) => {
  const stopLoss = resolveStopLossPrice({
    side,
    entryPrice,
    rule: riskManagement?.stopLoss,
    context,
    previousContext,
    candles,
    index,
  });

  const takeProfit = resolveTakeProfitPrice({
    side,
    entryPrice,
    stopLossPrice: stopLoss,
    rule: riskManagement?.takeProfit,
    context,
    previousContext,
  });

  return { stopLoss, takeProfit };
};

export const getRiskExit = ({ position, candle }) => {
  if (position.side === "buy") {
    if (position.stopLoss != null && candle.low <= position.stopLoss) {
      return { price: position.stopLoss, reason: "stopLoss" };
    }

    if (position.takeProfit != null && candle.high >= position.takeProfit) {
      return { price: position.takeProfit, reason: "takeProfit" };
    }
  }

  if (position.side === "sell") {
    if (position.stopLoss != null && candle.high >= position.stopLoss) {
      return { price: position.stopLoss, reason: "stopLoss" };
    }

    if (position.takeProfit != null && candle.low <= position.takeProfit) {
      return { price: position.takeProfit, reason: "takeProfit" };
    }
  }

  return null;
};
