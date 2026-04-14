import Joi from "joi";

export const BacktestSchema = {
  create: Joi.object({
    exchange: Joi.string().default("binance"),
    initialBalance: Joi.number().positive().default(10000),
    amountPerTrade: Joi.number().positive().default(100),
    entryFeeRate: Joi.number().min(0).default(0),
    exitFeeRate: Joi.number().min(0).default(0),
    hedgeMode: Joi.boolean().default(false),

    symbol: Joi.string().required(),
    timeframe: Joi.string().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref("startDate")).required(),
    strategyId: Joi.string().hex().length(24).required(),
  }),

  update: Joi.object({
    exchange: Joi.string(),
    initialBalance: Joi.number().positive(),
    amountPerTrade: Joi.number().positive(),
    entryFeeRate: Joi.number().min(0),
    exitFeeRate: Joi.number().min(0),
    hedgeMode: Joi.boolean(),

    symbol: Joi.string().required(),
    timeframe: Joi.string().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref("startDate")).required(),
    strategyId: Joi.string().hex().length(24).required(),
  }),

  query: {
    getExchangeData: Joi.object({
      exchange: Joi.string().default("binance"),
    }),

    getBacktests: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow(""),
      source: Joi.string().valid("all", "me").default("all"),
      duration: Joi.string()
        .valid("all", "7d", "1m", "3m", "6m", "1y")
        .default("all"),
      sortBy: Joi.string()
        .valid(
          "roi",
          "winRate",
          "createdAt",
          "updatedAt",
          "profitFactor",
          "maxDrawdownPercent",
        )
        .default("roi"),
      order: Joi.string().valid("asc", "desc").default("desc"),
    }),
  },

  param: {
    backtestId: Joi.object({
      backtestId: Joi.string().hex().length(24).required(),
    }),
  },
};
