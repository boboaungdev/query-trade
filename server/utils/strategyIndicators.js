const CANDLE_FIELDS = new Set(["open", "high", "low", "close", "volume"]);

const isPlainObject = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

const isIndicatorReference = (value) =>
  typeof value === "string" && value.trim() && !CANDLE_FIELDS.has(value.trim());

const addIndicatorReference = (value, usedKeys) => {
  if (!isIndicatorReference(value)) return;
  usedKeys.add(value.trim());
};

const collectConditionReferences = (condition, usedKeys) => {
  if (!condition) return;

  if (Array.isArray(condition.conditions)) {
    for (const childCondition of condition.conditions) {
      collectConditionReferences(childCondition, usedKeys);
    }
    return;
  }

  addIndicatorReference(condition.left, usedKeys);
  addIndicatorReference(condition.right, usedKeys);
};

const collectRiskManagementReferences = (riskManagement, usedKeys) => {
  if (!isPlainObject(riskManagement)) return;

  const stopLoss = riskManagement.stopLoss;
  const takeProfit = riskManagement.takeProfit;

  if (stopLoss?.type === "indicator") {
    addIndicatorReference(stopLoss.indicator, usedKeys);
  }

  if (takeProfit?.type === "indicator") {
    addIndicatorReference(takeProfit.indicator, usedKeys);
  }
};

export const extractUsedIndicatorKeys = (strategy) => {
  const usedKeys = new Set();
  const buyEntry = strategy?.entry?.buy;
  const sellEntry = strategy?.entry?.sell;

  if (buyEntry) {
    for (const condition of buyEntry.conditions || []) {
      collectConditionReferences(condition, usedKeys);
    }
    collectRiskManagementReferences(buyEntry.riskManagement, usedKeys);
  }

  if (sellEntry) {
    for (const condition of sellEntry.conditions || []) {
      collectConditionReferences(condition, usedKeys);
    }
    collectRiskManagementReferences(sellEntry.riskManagement, usedKeys);
  }

  return usedKeys;
};

const matchesIndicatorKey = (usedKey, indicatorKey) =>
  usedKey === indicatorKey || usedKey.startsWith(`${indicatorKey}.`);

export const pruneUnusedIndicators = (strategy) => {
  const indicators = Array.isArray(strategy?.indicators)
    ? strategy.indicators
    : [];
  const usedKeys = extractUsedIndicatorKeys(strategy);

  return indicators.filter(
    (indicator) =>
      typeof indicator?.key === "string" &&
      [...usedKeys].some((usedKey) =>
        matchesIndicatorKey(usedKey, indicator.key),
      ),
  );
};

export const validateIndicatorReferences = (strategy) => {
  const indicators = Array.isArray(strategy?.indicators)
    ? strategy.indicators
    : [];
  const usedKeys = extractUsedIndicatorKeys(strategy);

  return [...usedKeys].filter(
    (usedKey) =>
      !indicators.some((indicator) =>
        matchesIndicatorKey(usedKey, indicator?.key),
      ),
  );
};

export const extractRequiredAtrPeriods = (strategy) => {
  const periods = new Set();

  const maybeAddPeriod = (block) => {
    const period = block?.riskManagement?.stopLoss?.period;

    if (block?.riskManagement?.stopLoss?.type !== "atr") {
      return;
    }

    if (Number.isInteger(period) && period > 0) {
      periods.add(period);
    }
  };

  maybeAddPeriod(strategy?.entry?.buy);
  maybeAddPeriod(strategy?.entry?.sell);

  return [...periods];
};
