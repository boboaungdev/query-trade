import Joi from "joi";

const objectId = Joi.string().hex().length(24);

const sourceSchema = Joi.string()
  .valid("open", "high", "low", "close", "volume")
  .default("close");

const valueOperandSchema = Joi.alternatives().try(
  Joi.string(),
  Joi.number(),
  Joi.boolean(),
  Joi.object().unknown(true),
  Joi.array().items(Joi.any()),
);

const conditionSchema = Joi.alternatives()
  .try(
    Joi.object({
      logic: Joi.string().valid("and", "or").required(),
      conditions: Joi.array().items(Joi.link("#condition")).min(1).required(),
    }),
    Joi.object({
      left: valueOperandSchema.required(),
      operator: Joi.string()
        .valid(">", "<", ">=", "<=", "==", "!=", "crossAbove", "crossBelow")
        .required(),
      right: valueOperandSchema.required(),
    }),
  )
  .id("condition");

const candleStopLossWindowSchema = Joi.object({
  type: Joi.string().valid("candle").required(),
  previousCandles: Joi.number().integer().min(0).required(),
  aggregation: Joi.string().valid("single", "min", "max", "average").required(),
});

const stopLossSchema = Joi.alternatives()
  .try(
    candleStopLossWindowSchema,
    Joi.object({
      type: Joi.string().valid("indicator").required(),
      indicator: Joi.string().required(),
    }),
    Joi.object({
      type: Joi.string().valid("percent").required(),
      value: Joi.number().positive().required(),
    }),
    Joi.object({
      type: Joi.string().valid("atr").required(),
      period: Joi.number().integer().min(1).required(),
      multiplier: Joi.number().positive().required(),
    }),
  )
  .required();

const takeProfitSchema = Joi.object({
  type: Joi.string().valid("riskReward", "percent", "indicator").required(),

  ratio: Joi.when("type", {
    is: "riskReward",
    then: Joi.number().positive().required(),
    otherwise: Joi.forbidden(),
  }),

  value: Joi.when("type", {
    is: "percent",
    then: Joi.number().positive().required(),
    otherwise: Joi.forbidden(),
  }),

  indicator: Joi.when("type", {
    is: "indicator",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
}).required();

const riskManagementSchema = Joi.object({
  stopLoss: stopLossSchema.required(),
  takeProfit: takeProfitSchema.required(),
});

const logicBlockSchema = Joi.object({
  logic: Joi.string().valid("and", "or").required(),
  conditions: Joi.array().items(conditionSchema).min(1).required(),
  riskManagement: riskManagementSchema.required(),
});

const strategyIndicatorSchema = Joi.object({
  indicator: objectId.required(),
  key: Joi.string().trim().required(),
  source: sourceSchema,
  params: Joi.object().unknown(true).default({}),
});

export const StrategySchema = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    description: Joi.string().trim().allow(""),
    isPublic: Joi.boolean().default(true),
    indicators: Joi.array().items(strategyIndicatorSchema),
    entry: Joi.object({
      buy: logicBlockSchema.required(),
      sell: logicBlockSchema.required(),
    }).required(),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    description: Joi.string().trim().allow(""),
    isPublic: Joi.boolean(),
    indicators: Joi.array().items(strategyIndicatorSchema),
    entry: Joi.object({
      buy: logicBlockSchema,
      sell: logicBlockSchema,
    }).min(1),
  }).min(1),

  query: {
    getStrategies: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow(""),
      source: Joi.string().valid("all", "mine", "bookmarked").default("all"),
      sortBy: Joi.string()
        .valid("name", "createdAt", "updatedAt", "popular")
        .default("name"),
      order: Joi.string().valid("asc", "desc").default("asc"),
      isPublic: Joi.boolean().truthy("true").falsy("false").empty(""),
    }),
  },

  params: {
    strategyId: Joi.object({
      strategyId: objectId.required(),
    }),
  },
};
