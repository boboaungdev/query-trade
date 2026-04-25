import Joi from "joi";

export const UserSchema = {
  signup: Joi.object({
    name: Joi.string()
      .pattern(/^[A-Za-z0-9 ]+$/)
      .min(1)
      .max(20)
      .required(),
    username: Joi.string()
      .pattern(/^[a-z][a-z0-9]*$/)
      .min(6)
      .max(20)
      .required()
      .messages({
        "string.pattern.base":
          "Start with a lowercase letter; use lowercase letters and numbers only",
        "string.min": "At least 6 characters",
        "string.max": "At most 20 characters",
      }),
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
    password: Joi.string().min(6).max(50).required(),
  }),

  signupVerify: Joi.object({
    code: Joi.string().required(),
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
  }),

  signin: Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
    password: Joi.string().min(6).max(50).required(),
  }),

  existUser: Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase(),
    username: Joi.string()
      .trim()
      .pattern(/^[a-z0-9]{6,20}$/)
      .messages({
        "string.pattern.base":
          "Username must be 6-20 characters: lowercase letters and numbers only",
      }),
  }).or("email", "username"),

  signinGoogle: Joi.object({
    credential: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
  }),

  forgotPasswordVerify: Joi.object({
    code: Joi.string().required(),
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
  }),

  resetPassword: Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
    newPassword: Joi.string().min(6).max(50).required(),
  }),

  update: Joi.object({
    name: Joi.string()
      .trim()
      .pattern(/^[A-Za-z0-9 ]+$/)
      .min(1)
      .max(20)
      .optional(),

    username: Joi.string()
      .trim()
      .pattern(/^[a-z][a-z0-9]*$/)
      .min(6)
      .max(20)
      .optional()
      .messages({
        "string.pattern.base":
          "Start with a lowercase letter; use lowercase letters and numbers only",
        "string.min": "At least 6 characters",
        "string.max": "At most 20 characters",
      }),

    avatar: Joi.string().allow("").optional(),

    bio: Joi.string().trim().max(50).allow("").optional(),

    password: Joi.string().min(6).max(50).optional(),
  }).min(1),

  checkChangeEmail: Joi.object({
    newEmail: Joi.string()
      .email({ minDomainSegments: 2 })
      .lowercase()
      .required(),
    password: Joi.string().min(6).max(50).required(),
  }),

  verifyChangeEmail: Joi.object({
    newEmail: Joi.string()
      .email({ minDomainSegments: 2 })
      .lowercase()
      .required(),
    code: Joi.string().length(6).required(),
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string().min(6).max(50).required(),
    newPassword: Joi.string().min(6).max(50).required(),
  }),

  verifyChangePassword: Joi.object({
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
    code: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).max(50).required(),
  }),

  createPassword: Joi.object({
    password: Joi.string().min(6).max(50).required(),
  }),

  connectGoogle: Joi.object({
    googleId: Joi.string().required(),
  }),

  deleteAccount: Joi.object({
    password: Joi.string().min(6).max(50),
    code: Joi.string().length(6),
  }).or("password", "code"),

  params: {
    userId: Joi.object({
      userId: Joi.string().hex().length(24).required(),
    }),
    username: Joi.object({
      username: Joi.string().trim().required(),
    }),
  },

  query: {
    profileFollows: Joi.object({
      type: Joi.string().valid("followers", "following").required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow(""),
      sortBy: Joi.string().valid("name", "username").default("name"),
      order: Joi.string().valid("asc", "desc").default("asc"),
    }),

    profileStrategies: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow(""),
      sortBy: Joi.string()
        .valid("name", "createdAt", "updatedAt", "popular")
        .default("name"),
      order: Joi.string().valid("asc", "desc").default("desc"),
    }),

    profileBacktests: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(60).default(12),
      search: Joi.string().trim().allow(""),
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
};
