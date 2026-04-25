import Joi from "joi";

import { PAYMENT_CURRENCIES } from "../constants/subscription.js";

export const WalletSchema = {
  deposit: Joi.object({
    amountUsdt: Joi.number().min(0.000001).precision(8).required(),
    payCurrency: Joi.string()
      .valid(...Object.keys(PAYMENT_CURRENCIES))
      .required(),
  }),

  verifyPayment: Joi.object({
    txHash: Joi.string()
      .trim()
      .pattern(/^0x[a-fA-F0-9]{64}$/)
      .messages({
        "string.pattern.base": "Enter a valid txHash, not a wallet address.",
        "string.empty": "Transaction hash is required.",
        "any.required": "Transaction hash is required.",
      })
      .required(),
  }),

  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),

  params: {
    paymentId: Joi.object({
      paymentId: Joi.string().hex().length(24).required(),
    }),
  },
};
