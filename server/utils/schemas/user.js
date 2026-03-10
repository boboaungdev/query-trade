import Joi from "joi";

export const UserSchema = {
  signup: Joi.object({
    name: Joi.string()
      .pattern(/^[A-Za-z0-9 ]+$/)
      .min(1)
      .max(20)
      .required(),
    username: Joi.string()
      .pattern(/^[a-z0-9]+$/)
      .min(6)
      .max(20)
      .required(),
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
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
  }),

  signinGoogle: Joi.object({
    name: Joi.string().required(),
    avatar: Joi.string().required(),
    googleId: Joi.string().required(),
    email: Joi.string().email({ minDomainSegments: 2 }).lowercase().required(),
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
      .pattern(/^[a-z0-9]+$/)
      .min(6)
      .max(20)
      .optional(),

    avatar: Joi.string().allow("").optional(),

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

  // createPassword: Joi.object({
  //   newPassword: Joi.string()
  //     .pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()_+={}|:"<>?\\,-.]{8,30}$'))
  //     .required(),
  // }),

  // deleteAccount: Joi.object({
  //   password: Joi.string()
  //     .pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()_+={}|:"<>?\\,-.]{8,30}$'))
  //     .required(),
  // }),

  // existUsername: Joi.object({
  //   username: Joi.string()
  //     .pattern(/^[a-z0-9]+$/)
  //     .min(5)
  //     .max(20)
  //     .required(),
  // }),

  params: {
    userId: Joi.object({
      userId: Joi.string().hex().length(24).required(),
    }),
  },
};
