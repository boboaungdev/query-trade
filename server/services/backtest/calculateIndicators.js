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

const pad = (arr = [], len) => {
  const diff = Math.max(len - arr.length, 0);
  return Array(diff).fill(null).concat(arr);
};

// Dynamic key builder
const buildKey = (ind) => {
  const params = Object.entries(ind)
    .filter(([k]) => k !== "name" && k !== "source")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .join("_");

  return params ? `${ind.name}_${params}` : ind.name;
};

// Indicator registry
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
      SimpleMAOscillator: ind.SimpleMAOscillator,
      SimpleMASignal: ind.SimpleMASignal,
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

export const calculateIndicators = ({ candles, indicators }) => {
  const result = {};
  const sourceCache = {};

  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);
  const close = candles.map((c) => c.close);
  const volume = candles.map((c) => c.volume);

  for (const ind of indicators) {
    const source = ind?.source || "close";

    if (!sourceCache[source]) {
      sourceCache[source] = candles.map((c) => c[source] ?? null);
    }

    const values = sourceCache[source];

    const indicator = indicatorRegistry[ind.name];
    if (!indicator) {
      throw new Error(`Unsupported indicator: ${ind.name}`);
    }

    const key = buildKey(ind);
    const output = indicator({
      ind,
      values,
      high,
      low,
      close,
      volume,
    });

    result[key] = pad(output, candles.length);
  }

  return result;
};
