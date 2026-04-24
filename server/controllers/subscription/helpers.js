import {
  SUBSCRIPTION_PROVIDER,
  TOKEN_TRANSACTION_TYPES,
} from "../../constants/subscription.js";
import { SubscriptionDB } from "../../models/subscription.js";
import { SubscriptionPlanDB } from "../../models/subscriptionPlan.js";
import { TokenTransactionDB } from "../../models/tokenTransaction.js";
import { UserDB } from "../../models/user.js";
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

export const recordTokenTransaction = async ({
  userId,
  type,
  amount,
  paymentId = null,
  plan = null,
  description = "",
  metadata = {},
}) => {
  const user = await UserDB.findById(userId).select("tokenBalance").lean();

  if (!user) {
    throw resError(404, "User not found.");
  }

  const balanceBefore = Number(user.tokenBalance || 0);
  const delta = type === TOKEN_TRANSACTION_TYPES.spend ? -amount : amount;

  if (balanceBefore + delta < 0) {
    throw resError(400, "Insufficient token balance.");
  }

  const updatedUser = await UserDB.findOneAndUpdate(
    {
      _id: userId,
      ...(type === TOKEN_TRANSACTION_TYPES.spend
        ? { tokenBalance: { $gte: amount } }
        : {}),
    },
    {
      $inc: {
        tokenBalance: delta,
      },
    },
    {
      returnDocument: "after",
    },
  )
    .select("tokenBalance")
    .lean();

  if (!updatedUser) {
    throw resError(400, "Insufficient token balance.");
  }

  const tokenTransaction = await TokenTransactionDB.create({
    user: userId,
    type,
    amount,
    balanceBefore,
    balanceAfter: Number(updatedUser.tokenBalance || 0),
    payment: paymentId,
    plan,
    description,
    metadata,
  });

  return {
    tokenTransaction,
    tokenBalance: Number(updatedUser.tokenBalance || 0),
  };
};

export const activateSubscription = async ({
  userId,
  plan,
  planSnapshot,
  tokenTransactionId,
  tokenAmount,
}) => {
  const durationDays = planSnapshot?.durationDays ?? 30;
  const now = new Date();
  const existing = await SubscriptionDB.findOne({ user: userId });
  const isSamePlanRenewal = existing?.plan === plan;
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
    { user: userId },
    {
      $set: {
        plan,
        status: "active",
        currentPeriodStart,
        currentPeriodEnd,
        provider: SUBSCRIPTION_PROVIDER,
        providerPaymentId: String(tokenTransactionId),
        lastTransaction: tokenTransactionId,
        lastTokenAmount: tokenAmount,
        lastTokenTransactionType: TOKEN_TRANSACTION_TYPES.spend,
      },
    },
    { returnDocument: "after", upsert: true },
  ).lean();
};
