import { TOKEN_TRANSACTION_TYPES } from "../../constants/subscription.js";
import { SubscriptionPlanDB } from "../../models/subscriptionPlan.js";
import { calculatePlanPricing } from "../../services/subscription/calculatePlanPricing.js";
import { resError, resJson } from "../../utils/response.js";
import {
  activateSubscription,
  recordTokenTransaction,
  validatePlanChange,
} from "./helpers.js";

export const createCheckout = async (req, res, next) => {
  try {
    const user = req.user;
    const { plan: planId } = req.body;
    const plan = await SubscriptionPlanDB.findOne({
      key: planId,
      isActive: true,
    }).lean();

    if (!plan || plan.key === "free") {
      throw resError(404, "Subscription plan not found.");
    }

    const pricing = calculatePlanPricing(plan);
    await validatePlanChange(user._id, planId);

    if (Number(user.tokenBalance || 0) < pricing.finalAmountToken) {
      throw resError(
        400,
        `You need ${pricing.finalAmountToken} token to subscribe to ${plan.name}.`,
      );
    }

    const { tokenTransaction, tokenBalance } = await recordTokenTransaction({
      userId: user._id,
      type: TOKEN_TRANSACTION_TYPES.spend,
      amount: pricing.finalAmountToken,
      plan: plan.key,
      description: `Subscribed to ${plan.name}`,
      metadata: {
        durationDays: plan.durationDays,
        originalAmountToken: pricing.originalAmountToken,
        discountAmountToken: pricing.discountAmountToken,
      },
    });

    const subscription = await activateSubscription({
      userId: user._id,
      plan: plan.key,
      planSnapshot: {
        key: plan.key,
        name: plan.name,
        originalAmountToken: pricing.originalAmountToken,
        discountAmountToken: pricing.discountAmountToken,
        finalAmountToken: pricing.finalAmountToken,
        durationDays: plan.durationDays,
        discount: plan.discount || {},
      },
      tokenTransactionId: tokenTransaction._id,
      tokenAmount: pricing.finalAmountToken,
    });

    return resJson(res, 201, "Subscription activated with token.", {
      subscription,
      tokenTransaction,
      tokenBalance,
    });
  } catch (error) {
    next(error);
  }
};
