import Joi from "joi";

const objectId = Joi.string().hex().length(24);
const targetType = Joi.string().valid("strategy", "backtest");

export const BookmarkSchema = {
  create: Joi.object({
    targetType: targetType.required(),
    target: objectId.required(),
  }),

  query: {
    getBookmarks: Joi.object({
      targetType,
      page: Joi.number().integer().min(1).default(1),
      search: Joi.string().trim().allow("").optional(),
      limit: Joi.number().integer().min(1).max(60).default(12),
      order: Joi.string().valid("asc", "desc").default("desc"),
      sortBy: Joi.string().valid("createdAt", "updatedAt").default("createdAt"),
    }),
  },

  params: {
    deleteBookmark: Joi.object({
      targetType: targetType.required(),
      targetId: objectId.required(),
    }),
  },
};
