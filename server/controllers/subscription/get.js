import { TOKEN_PER_USDT } from "../../constants/index.js";
import { PAYMENT_CURRENCIES } from "../../constants/subscription.js";
import { SubscriptionPlanModel } from "../../models/subscriptionPlan.js";
import { serializePlan } from "../../services/subscription/calculatePlanPricing.js";
import { resJson } from "../../utils/response.js";
import { getEffectiveSubscription } from "./helpers.js";

export const getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlanModel.find({ isActive: true })
      .sort({ sortOrder: 1, amountToken: 1 })
      .lean();

    return resJson(res, 200, "Subscription plans.", {
      plans: plans.map(serializePlan),
      currencies: Object.values(PAYMENT_CURRENCIES),
      tokenPerUsdt: TOKEN_PER_USDT,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySubscription = async (req, res, next) => {
  try {
    const user = req.user;
    const subscription = await getEffectiveSubscription(user._id);

    return resJson(res, 200, "Current subscription.", {
      subscription,
      tokenBalance: Number(user.tokenBalance || 0),
    });
  } catch (error) {
    next(error);
  }
};
