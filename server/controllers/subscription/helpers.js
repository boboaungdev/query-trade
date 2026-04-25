import { WALLET_TRANSACTION_TYPES } from "../../constants/subscription.js";
import { SubscriptionModel } from "../../models/subscription.js";
import { SubscriptionPlanModel } from "../../models/subscriptionPlan.js";
import { WalletTransactionModel } from "../../models/walletTransaction.js";
import { UserDB } from "../../models/user.js";
import { resError } from "../../utils/response.js";

export const getEffectiveSubscription = async (userId) => {
  const now = new Date();
  const subscription = await SubscriptionModel.findOne({ user: userId }).lean();

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
    await SubscriptionModel.updateOne(
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
      : SubscriptionPlanModel.findOne({ key: subscription.plan })
          .select("key sortOrder")
          .lean(),
    SubscriptionPlanModel.findOne({ key: nextPlanId, isActive: true })
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

export const recordWalletTransaction = async ({
  userId,
  type,
  amount,
  paymentId = null,
  planKey = null,
  description = "",
  metadata = {},
}) => {
  const user = await UserDB.findById(userId).select("tokenBalance").lean();

  if (!user) {
    throw resError(404, "User not found.");
  }

  const balanceBefore = Number(user.tokenBalance || 0);
  const delta = type === WALLET_TRANSACTION_TYPES.spend ? -amount : amount;

  if (balanceBefore + delta < 0) {
    throw resError(400, "Insufficient token balance.");
  }

  const updatedUser = await UserDB.findOneAndUpdate(
    {
      _id: userId,
      ...(type === WALLET_TRANSACTION_TYPES.spend
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

  const walletTransaction = await WalletTransactionModel.create({
    user: userId,
    type,
    amount,
    balanceBefore,
    balanceAfter: Number(updatedUser.tokenBalance || 0),
    payment: paymentId,
    planKey,
    description,
    metadata,
  });

  return {
    walletTransaction,
    tokenBalance: Number(updatedUser.tokenBalance || 0),
  };
};

export const activateSubscription = async ({
  userId,
  plan,
  durationDays = 30,
}) => {
  const now = new Date();
  const existing = await SubscriptionModel.findOne({ user: userId });
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

  return SubscriptionModel.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        plan,
        status: "active",
        currentPeriodStart,
        currentPeriodEnd,
      },
    },
    { returnDocument: "after", upsert: true },
  ).lean();
};
