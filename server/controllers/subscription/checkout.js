import { WALLET_TRANSACTION_TYPES } from "../../constants/subscription.js";
import { UserDB } from "../../models/user.js";
import { SubscriptionPlanModel } from "../../models/subscriptionPlan.js";
import { calculatePlanPricing } from "../../services/subscription/calculatePlanPricing.js";
import { serializeMembership } from "../../services/subscription/serializeMembership.js";
import { resError, resJson } from "../../utils/response.js";
import {
  activateSubscription,
  recordWalletTransaction,
  validatePlanChange,
} from "./helpers.js";

export const createCheckout = async (req, res, next) => {
  try {
    const user = req.user;
    const { plan: planId } = req.body;
    const plan = await SubscriptionPlanModel.findOne({
      key: planId,
      isActive: true,
    }).lean();

    if (!plan || plan.key === "free") {
      throw resError(404, "Subscription plan not found.");
    }

    const pricing = calculatePlanPricing(plan);
    await validatePlanChange(user._id, planId);
    const currentUser = await UserDB.findById(user._id)
      .select("tokenBalance")
      .lean();

    if (!currentUser) {
      throw resError(404, "User not found.");
    }

    if (Number(currentUser.tokenBalance || 0) < pricing.finalAmountToken) {
      throw resError(
        400,
        `You need ${pricing.finalAmountToken} token to subscribe to ${plan.name}.`,
      );
    }

    const { walletTransaction, tokenBalance } = await recordWalletTransaction({
      userId: user._id,
      type: WALLET_TRANSACTION_TYPES.spend,
      amount: pricing.finalAmountToken,
      planKey: plan.key,
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
      durationDays: plan.durationDays,
    });

    return resJson(res, 201, "Subscription activated with token.", {
      subscription,
      membership: serializeMembership(subscription),
      walletTransaction,
      tokenBalance,
    });
  } catch (error) {
    next(error);
  }
};
