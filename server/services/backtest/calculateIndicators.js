import {
  EMA,
  SMA,
  RSI,
  MACD,
  ATR,
  ADX,
  WMA,
  VWAP,
  BollingerBands,
  Stochastic,
} from "technicalindicators";

const indicatorRegistry = {
  ema: ({ ind, values }) => EMA.calculate({ period: ind.period, values }),

  sma: ({ ind, values }) => SMA.calculate({ period: ind.period, values }),

  wma: ({ ind, values }) => WMA.calculate({ period: ind.period, values }),

  rsi: ({ ind, values }) => RSI.calculate({ period: ind.period, values }),

  macd: ({ ind, values }) =>
    MACD.calculate({
      values,
      fastPeriod: ind.fastPeriod,
      slowPeriod: ind.slowPeriod,
      signalPeriod: ind.signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    }),

  bb: ({ ind, values }) =>
    BollingerBands.calculate({
      values,
      period: ind.period,
      stdDev: ind.stdDev,
    }),

  atr: ({ ind, high, low, close }) =>
    ATR.calculate({
      period: ind.period,
      high,
      low,
      close,
    }),

  stochastic: ({ ind, high, low, close }) =>
    Stochastic.calculate({
      high,
      low,
      close,
      period: ind.period,
      signalPeriod: ind.signalPeriod,
    }),

  adx: ({ ind, high, low, close }) =>
    ADX.calculate({
      high,
      low,
      close,
      period: ind.period,
    }),

  vwap: ({ high, low, close, volume }) =>
    VWAP.calculate({
      high,
      low,
      close,
      volume,
    }),
};

const toObject = (value) => {
  if (!value) return {};
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  return value;
};

const padIndicatorValues = ({ values, targetLength }) => {
  const missingCount = Math.max(targetLength - values.length, 0);
  return [...Array(missingCount).fill(null), ...values];
};

const buildSeries = (candles, source) =>
  candles.map((candle) => candle[source]);

export const calculateIndicators = ({ candles, indicators }) => {
  const open = buildSeries(candles, "open");
  const high = buildSeries(candles, "high");
  const low = buildSeries(candles, "low");
  const close = buildSeries(candles, "close");
  const volume = buildSeries(candles, "volume");

  const indicatorSeries = {};

  for (const item of indicators) {
    const indicatorDoc = item.indicator;
    const indicatorName = indicatorDoc?.name?.toLowerCase?.();
    const calculator = indicatorRegistry[indicatorName];

    if (!indicatorName || !calculator) {
      throw new Error(`Unsupported indicator '${indicatorName || "unknown"}'`);
    }

    const indicatorDefaults = toObject(indicatorDoc?.params);
    const indicatorParams = {
      ...indicatorDefaults,
      ...toObject(item.params),
    };

    const source = item.source || indicatorDoc?.source || "close";
    const values = buildSeries(candles, source);

    const calculatedValues = calculator({
      ind: indicatorParams,
      values,
      open,
      high,
      low,
      close,
      volume,
    });

    indicatorSeries[item.key] = padIndicatorValues({
      values: calculatedValues,
      targetLength: candles.length,
    });
  }

  return candles.map((_, index) => {
    const row = {};

    for (const item of indicators) {
      row[item.key] = indicatorSeries[item.key]?.[index] ?? null;
    }

    return row;
  });
};

export const calculateRiskIndicators = ({ candles, atrPeriods = [] }) => {
  const uniqueAtrPeriods = [
    ...new Set(
      atrPeriods.filter(
        (period) =>
          Number.isInteger(period) && Number.isFinite(period) && period > 0,
      ),
    ),
  ];

  if (uniqueAtrPeriods.length === 0) {
    return candles.map(() => ({}));
  }

  const syntheticAtrIndicators = uniqueAtrPeriods.map((period) => ({
    key: `atr_${period}`,
    indicator: {
      name: "atr",
      params: { period },
    },
  }));

  return calculateIndicators({
    candles,
    indicators: syntheticAtrIndicators,
  });
};
