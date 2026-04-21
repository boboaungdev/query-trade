import Joi from "joi";

export const IndicatorSchema = {
  create: Joi.object({
    name: Joi.string()
      .trim()
      .lowercase()
      .min(2)
      .max(20)
      .pattern(/^[a-z0-9]+$/)
      .message(
        "Name must contain only lowercase letters and numbers with no spaces",
      )
      .required(),
    description: Joi.string().trim().min(2).max(50).required(),
    category: Joi.string()
      .valid("trend", "momentum", "volatility", "volume", "support_resistance")
      .required(),
    source: Joi.string()
      .valid("open", "high", "low", "close", "volume")
      .default("close"),
    params: Joi.object()
      .pattern(
        Joi.string(),
        Joi.alternatives().try(Joi.number(), Joi.boolean()),
      )
      .default({}),
  }),

  update: Joi.object({
    name: Joi.string()
      .trim()
      .lowercase()
      .min(2)
      .max(20)
      .pattern(/^[a-z0-9]+$/)
      .message(
        "Name must contain only lowercase letters and numbers with no spaces",
      ),

    description: Joi.string().trim().min(2).max(50),
    category: Joi.string().valid(
      "trend",
      "momentum",
      "volatility",
      "volume",
      "support_resistance",
    ),
    source: Joi.string().valid("open", "high", "low", "close", "volume"),
    params: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(Joi.number(), Joi.boolean()),
    ),
  }).min(1),

  params: {
    indicatorId: Joi.object({
      indicatorId: Joi.string().hex().length(24).required(),
    }),
  },

  query: {
    getIndicators: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow(""),
      sortBy: Joi.string().valid("name", "createdAt").default("name"),
      order: Joi.string().valid("asc", "desc").default("asc"),

      category: Joi.string().valid(
        "trend",
        "momentum",
        "volatility",
        "volume",
        "support_resistance",
      ),
    }),
  },
};
