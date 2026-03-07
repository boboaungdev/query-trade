import Joi from "joi";

/* -----------------------------
   Common Small Schemas
------------------------------*/

// Condition schema
const conditionSchema = Joi.object({
  left: Joi.alternatives().try(Joi.string(), Joi.number()).required(), // e.g. "ema_10" or 40 (indicator key or number)
  operator: Joi.string().valid(">", "<", ">=", "<=", "==", "!=").required(),
  right: Joi.alternatives().try(Joi.string(), Joi.number()).required(), // indicator key or number
});

// Logic block (buy/sell)
const logicBlockSchema = Joi.object({
  logic: Joi.string().valid("and", "or").required(),
  conditions: Joi.array().items(conditionSchema).min(1).required(),
});

/* -----------------------------
   Indicator Schemas
------------------------------*/

const baseIndicator = {
  name: Joi.string()
    .valid(
      "ema",
      "sma",
      "wma",
      "rsi",
      "macd",
      "bb",
      "atr",
      "stochastic",
      "adx",
      "vwap",
    )
    .required(),
  source: Joi.string()
    .valid("open", "high", "low", "close", "volume")
    .default("close"),
};

const indicatorSchema = Joi.object(baseIndicator)
  .when(
    Joi.object({
      name: Joi.valid("ema", "sma", "wma", "rsi", "atr", "adx"),
    }).unknown(),
    {
      then: Joi.object({
        period: Joi.number().integer().min(1).default(14),
      }),
    },
  )
  .when(Joi.object({ name: Joi.valid("bb") }).unknown(), {
    then: Joi.object({
      period: Joi.number().integer().min(1).default(20),
      stdDev: Joi.number().positive().default(2),
    }),
  })
  .when(Joi.object({ name: Joi.valid("macd") }).unknown(), {
    then: Joi.object({
      fastPeriod: Joi.number().integer().min(1).default(12),
      slowPeriod: Joi.number().integer().min(1).default(26),
      signalPeriod: Joi.number().integer().min(1).default(9),
      SimpleMAOscillator: Joi.boolean().default(false),
      SimpleMASignal: Joi.boolean().default(false),
    }),
  })
  .when(Joi.object({ name: Joi.valid("stochastic") }).unknown(), {
    then: Joi.object({
      period: Joi.number().integer().min(1).default(14),
      signalPeriod: Joi.number().integer().min(1).default(3),
    }),
  })
  .when(Joi.object({ name: Joi.valid("vwap") }).unknown(), {
    then: Joi.object({}), // no params required
  });

/* -----------------------------
   Main Backtest Schema
------------------------------*/

export const BacktestSchema = {
  run: Joi.object({
    symbol: Joi.string().required(),
    exchange: Joi.string().default("binance"),
    timeframe: Joi.string().default("15m"),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date()
      .iso()
      .greater(Joi.ref("startTime"))
      .default(() => new Date().toISOString()),

    initialBalance: Joi.number().positive().default(10000),
    amountPerTrade: Joi.number().positive().default(100),

    marketType: Joi.string().valid("spot", "future").default("future"),

    entryOrderType: Joi.string().valid("market", "limit").default("limit"),
    exitOrderType: Joi.string().valid("market", "limit").default("limit"),

    strategy: Joi.object({
      indicators: Joi.array().items(indicatorSchema).min(1).required(),

      entry: Joi.object({
        buy: logicBlockSchema.required(),
        sell: logicBlockSchema.required(),
      }).required(),

      exit: Joi.object({
        buy: logicBlockSchema.required(),
        sell: logicBlockSchema.required(),
      }).required(),
    }).required(),
  }),
};
