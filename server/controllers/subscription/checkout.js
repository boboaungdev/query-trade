import crypto from "crypto";

import {
  isMockPaymentMode,
  PAYMENT_STATUSES,
} from "../../constants/subscription.js";
import { PaymentDB } from "../../models/payment.js";
import { SubscriptionPlanDB } from "../../models/subscriptionPlan.js";
import { getReceiveAddress } from "../../services/bscPayment.js";
import { calculatePlanPricing } from "../../services/subscription/calculatePlanPricing.js";
import { resError } from "../../utils/response.js";
import { resJson } from "../../utils/response.js";
import { activateSubscription, validatePlanChange } from "./helpers.js";

export const createCheckout = async (req, res, next) => {
  try {
    const user = req.user;
    const { plan: planId, payCurrency } = req.body;
    const plan = await SubscriptionPlanDB.findOne({
      key: planId,
      isActive: true,
    }).lean();

    if (!plan || plan.key === "free") {
      throw resError(404, "Subscription plan not found.");
    }

    const pricing = calculatePlanPricing(plan);
    await validatePlanChange(user._id, planId);
    await PaymentDB.updateMany(
      {
        user: user._id,
        status: PAYMENT_STATUSES.pending,
      },
      {
        $set: {
          status: PAYMENT_STATUSES.expired,
          providerStatus: "manual_replaced",
        },
      },
    );

    const orderId = `qt_${user._id}_${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}`;

    const payment = await PaymentDB.create({
      user: user._id,
      plan: planId,
      amountUsd: pricing.finalAmountUsd,
      planSnapshot: {
        key: plan.key,
        name: plan.name,
        originalAmountUsd: pricing.originalAmountUsd,
        discountAmountUsd: pricing.discountAmountUsd,
        finalAmountUsd: pricing.finalAmountUsd,
        durationDays: plan.durationDays,
        discount: plan.discount || {},
      },
      status: PAYMENT_STATUSES.pending,
      orderId,
      payCurrency,
    });

    if (isMockPaymentMode()) {
      payment.status = PAYMENT_STATUSES.confirmed;
      payment.providerStatus = "mock_confirmed";
      payment.confirmedAt = new Date();
      payment.rawPayload = {
        provider: "dev_mock",
        message: "Payment was confirmed by DEV_MOCK_PAYMENTS.",
      };
      await payment.save();

      const subscription = await activateSubscription(payment);

      return resJson(res, 201, "Mock checkout confirmed.", {
        payment,
        subscription,
        mock: true,
      });
    }

    payment.payAddress = getReceiveAddress();
    payment.payAmount = pricing.finalAmountUsd;
    payment.rawPayload = {
      provider: "manual",
      message: "Waiting for user-submitted USDT BEP20 transaction hash.",
    };
    await payment.save();

    return resJson(res, 201, "Manual payment created.", {
      payment,
      manualPayment: true,
    });
  } catch (error) {
    next(error);
  }
};
