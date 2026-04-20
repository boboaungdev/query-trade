export const defaultIndicators = [
  {
    name: "adx",
    description: "Average Directional Index",
    category: "trend",
    source: "close",
    params: {
      period: 14,
    },
  },
  {
    name: "atr",
    description: "Average True Range",
    category: "volatility",
    source: "close",
    params: {
      period: 14,
    },
  },
  {
    name: "bb",
    description: "Bollinger Bands",
    category: "volatility",
    source: "close",
    params: {
      period: 20,
      stdDev: 2,
    },
  },
  {
    name: "ema",
    description: "Exponential Moving Average",
    category: "trend",
    source: "close",
    params: {
      period: 14,
    },
  },
  {
    name: "macd",
    description: "Moving Average Convergence Divergence",
    category: "momentum",
    source: "close",
    params: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    },
  },
  {
    name: "rsi",
    description: "Relative Strength Index",
    category: "momentum",
    source: "close",
    params: {
      period: 14,
    },
  },
  {
    name: "sma",
    description: "Simple Moving Average",
    category: "trend",
    source: "close",
    params: {
      period: 14,
    },
  },
  {
    name: "stochastic",
    description: "Stochastic",
    category: "momentum",
    source: "close",
    params: {
      period: 14,
      signalPeriod: 3,
    },
  },
  {
    name: "vwap",
    description: "Volume Weighted Average Price",
    category: "volume",
    source: "close",
    params: {},
  },
  {
    name: "wma",
    description: "Weighted Moving Average",
    category: "trend",
    source: "close",
    params: {
      period: 14,
    },
  },
];
