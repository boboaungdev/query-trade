import Joi from "joi";

const planKeySchema = Joi.string()
  .trim()
  .lowercase()
  .min(2)
  .max(40)
  .pattern(/^[a-z0-9][a-z0-9_-]*$/)
  .messages({
    "string.pattern.base":
      "Plan key must start with a letter or number and use only lowercase letters, numbers, hyphens, or underscores.",
  });

export const SubscriptionSchema = {
  checkout: Joi.object({
    plan: planKeySchema.invalid("free").required(),
  }),

  plan: {
    create: Joi.object({
      name: Joi.string().trim().min(2).max(20).required(),
      amountToken: Joi.number().min(0).precision(8).required(),
      durationDays: Joi.number().integer().min(0).required(),
      features: Joi.array().items(Joi.string().trim().max(100)).default([]),
      discount: Joi.object({
        isActive: Joi.boolean().default(false),
        type: Joi.string().valid("percentage", "fixed").default("percentage"),
        value: Joi.number().min(0).precision(8).default(0),
        label: Joi.string().trim().allow("").max(40).default(""),
        startsAt: Joi.date().allow(null),
        endsAt: Joi.date().allow(null),
      }).optional(),
      isActive: Joi.boolean().default(true),
      sortOrder: Joi.number().integer().default(0),
    }),

    update: Joi.object({
      name: Joi.string().trim().min(2).max(20),
      amountToken: Joi.number().min(0).precision(8),
      durationDays: Joi.number().integer().min(0),
      features: Joi.array().items(Joi.string().trim().max(100)),
      discount: Joi.object({
        isActive: Joi.boolean(),
        type: Joi.string().valid("percentage", "fixed"),
        value: Joi.number().min(0).precision(8),
        label: Joi.string().trim().allow("").max(40),
        startsAt: Joi.date().allow(null),
        endsAt: Joi.date().allow(null),
      }).optional(),
      isActive: Joi.boolean(),
      sortOrder: Joi.number().integer(),
    }).min(1),

    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow("").default(""),
      sortBy: Joi.string()
        .valid("sortOrder", "name", "amountToken", "durationDays", "createdAt")
        .default("sortOrder"),
      order: Joi.string().valid("asc", "desc").default("asc"),
    }),
  },

  params: {
    planId: Joi.object({
      planId: Joi.string().hex().length(24).required(),
    }),
  },
};
