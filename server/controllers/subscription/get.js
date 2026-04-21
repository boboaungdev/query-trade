import { PAYMENT_CURRENCIES } from "../../constants/subscription.js";
import { PaymentDB } from "../../models/payment.js";
import { SubscriptionPlanDB } from "../../models/subscriptionPlan.js";
import { serializePlan } from "../../services/subscription/calculatePlanPricing.js";
import { resError, resJson } from "../../utils/response.js";
import { getEffectiveSubscription } from "./helpers.js";

export const getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlanDB.find({ isActive: true })
      .sort({ sortOrder: 1, amountUsd: 1 })
      .lean();

    return resJson(res, 200, "Subscription plans.", {
      plans: plans.map(serializePlan),
      currencies: Object.values(PAYMENT_CURRENCIES),
    });
  } catch (error) {
    next(error);
  }
};

export const getMySubscription = async (req, res, next) => {
  try {
    const user = req.user;
    const subscription = await getEffectiveSubscription(user._id);
    const latestPayment = await PaymentDB.findOne({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return resJson(res, 200, "Current subscription.", {
      subscription,
      latestPayment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const payments = await PaymentDB.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return resJson(res, 200, "Payment history.", {
      payments,
    });
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (req, res, next) => {
  try {
    const user = req.user;
    const payment = await PaymentDB.findOne({
      _id: req.params.paymentId,
      user: user._id,
    }).lean();

    if (!payment) {
      throw resError(404, "Payment not found.");
    }

    return resJson(res, 200, "Payment.", {
      payment,
    });
  } catch (error) {
    next(error);
  }
};
