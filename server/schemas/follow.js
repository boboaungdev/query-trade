import Joi from "joi";

const objectId = Joi.string().hex().length(24);

export const FollowSchema = {
  params: {
    userId: Joi.object({
      userId: objectId.required(),
    }),
  },

  query: {
    list: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow("").optional(),
    }),
  },
};
