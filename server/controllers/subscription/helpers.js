import { SUBSCRIPTION_PROVIDER } from "../../constants/subscription.js";
import { SubscriptionDB } from "../../models/subscription.js";
import { SubscriptionPlanDB } from "../../models/subscriptionPlan.js";
import { resError } from "../../utils/response.js";

export const getEffectiveSubscription = async (userId) => {
  const now = new Date();
  const subscription = await SubscriptionDB.findOne({ user: userId }).lean();

  if (!subscription) {
    return {
      plan: "free",
      status: "active",
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }

  if (
    subscription.plan !== "free" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd <= now
  ) {
    await SubscriptionDB.updateOne(
      { _id: subscription._id },
      { $set: { plan: "free", status: "active" } },
    );

    return {
      ...subscription,
      plan: "free",
      status: "active",
    };
  }

  return subscription;
};

export const validatePlanChange = async (userId, nextPlanId) => {
  const subscription = await getEffectiveSubscription(userId);
  const [currentPlan, nextPlan] = await Promise.all([
    subscription.plan === "free"
      ? Promise.resolve({ key: "free", sortOrder: 0 })
      : SubscriptionPlanDB.findOne({ key: subscription.plan })
          .select("key sortOrder")
          .lean(),
    SubscriptionPlanDB.findOne({ key: nextPlanId, isActive: true })
      .select("key sortOrder")
      .lean(),
  ]);

  if (!nextPlan || nextPlan.key === "free") {
    throw resError(404, "Subscription plan not found.");
  }

  const currentPlanRank = currentPlan?.sortOrder ?? 0;
  const nextPlanRank = nextPlan.sortOrder ?? 0;

  if (
    subscription.plan !== "free" &&
    subscription.status === "active" &&
    nextPlanRank < currentPlanRank
  ) {
    throw resError(
      403,
      `You cannot downgrade from ${subscription.plan} to ${nextPlanId} until your current plan expires.`,
    );
  }

  return subscription;
};

export const activateSubscription = async (payment) => {
  const durationDays = payment.planSnapshot?.durationDays ?? 30;
  const now = new Date();
  const existing = await SubscriptionDB.findOne({ user: payment.user });
  const isSamePlanRenewal = existing?.plan === payment.plan;
  const baseDate =
    isSamePlanRenewal &&
    existing?.currentPeriodEnd &&
    existing.currentPeriodEnd > now
      ? existing.currentPeriodEnd
      : now;
  const currentPeriodEnd = new Date(baseDate);
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + durationDays);

  const currentPeriodStart = baseDate;

  return SubscriptionDB.findOneAndUpdate(
    { user: payment.user },
    {
      $set: {
        plan: payment.plan,
        status: "active",
        currentPeriodStart,
        currentPeriodEnd,
        provider: SUBSCRIPTION_PROVIDER,
        providerPaymentId: payment.txHash,
        lastPayment: payment._id,
        lastPaymentAmountUsd: payment.amountUsd,
        lastPaymentCurrency: payment.payCurrency,
      },
    },
    { returnDocument: "after", upsert: true },
  ).lean();
};
