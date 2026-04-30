import { TOKEN_PER_USD } from "../../constants/index.js";
import {
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
} from "../../constants/subscription.js";
import { PaymentModel } from "../../models/payment.js";
import { SubscriptionModel } from "../../models/subscription.js";
import {
  TransactionModel,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from "../../models/transaction.js";
import { UserDB } from "../../models/user.js";
import { WalletTransactionModel } from "../../models/walletTransaction.js";
import { serializeMembership } from "../../services/subscription/serializeMembership.js";
import { resError, resJson } from "../../utils/response.js";

function getWalletTransactionForUser(
  transaction,
  currentUserId,
  walletTransactionMap = new Map(),
) {
  const currentUserIdString = String(currentUserId || "");
  const walletTransactionIds = Array.isArray(transaction.walletTransactions)
    ? transaction.walletTransactions
    : [];

  for (const walletTransactionId of walletTransactionIds) {
    const walletTransaction = walletTransactionMap.get(String(walletTransactionId));

    if (
      walletTransaction &&
      String(walletTransaction.user || "") === currentUserIdString
    ) {
      return walletTransaction;
    }
  }

  return null;
}

function getEmptyWalletStats() {
  return {
    totalRewardEarned: 0,
    totalDeposited: 0,
    totalSubscriptionSpent: 0,
    totalSent: 0,
    totalReceived: 0,
    totalWithdrawn: 0,
    totalRefunded: 0,
    totalAdjusted: 0,
    totalSpent: 0,
  };
}

function buildIncomeChartBuckets(days) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - 1 - index));

    return {
      key: date.toISOString().slice(0, 10),
      earned: 0,
    };
  });
}

function buildIncomeChartBucketsFromDate(startDateInput) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const startDate = new Date(startDateInput);
  startDate.setUTCHours(0, 0, 0, 0);

  if (Number.isNaN(startDate.getTime()) || startDate > today) {
    return [];
  }

  const buckets = [];
  const currentDate = new Date(startDate);

  while (currentDate <= today) {
    buckets.push({
      key: currentDate.toISOString().slice(0, 10),
      earned: 0,
    });
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return buckets;
}

export const getWalletSummary = async (req, res, next) => {
  try {
    const user = req.user;
    const [latestPayment, walletStatsResult] = await Promise.all([
      PaymentModel.findOne({
        user: user._id,
        purpose: PAYMENT_PURPOSES.tokenTopup,
      })
        .sort({ createdAt: -1 })
        .lean(),
      TransactionModel.aggregate([
        {
          $match: {
            participants: user._id,
            status: {
              $in: [
                PAYMENT_STATUSES.confirmed,
                TRANSACTION_STATUSES.completed,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRewardEarned: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TRANSACTION_TYPES.creatorReward] },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalDeposited: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TRANSACTION_TYPES.deposit] },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalSubscriptionSpent: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TRANSACTION_TYPES.subscription] },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalSent: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", TRANSACTION_TYPES.transfer] },
                      { $eq: ["$fromUser", user._id] },
                    ],
                  },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalReceived: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", TRANSACTION_TYPES.transfer] },
                      { $eq: ["$toUser", user._id] },
                    ],
                  },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalWithdrawn: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TRANSACTION_TYPES.withdraw] },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalRefunded: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TRANSACTION_TYPES.refund] },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalAdjusted: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TRANSACTION_TYPES.adjustment] },
                  "$tokenAmount",
                  0,
                ],
              },
            },
            totalSpent: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TRANSACTION_TYPES.spend] },
                  "$tokenAmount",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);
    const walletStats = walletStatsResult[0]
      ? {
          totalRewardEarned: Number(walletStatsResult[0].totalRewardEarned || 0),
          totalDeposited: Number(walletStatsResult[0].totalDeposited || 0),
          totalSubscriptionSpent: Number(
            walletStatsResult[0].totalSubscriptionSpent || 0,
          ),
          totalSent: Number(walletStatsResult[0].totalSent || 0),
          totalReceived: Number(walletStatsResult[0].totalReceived || 0),
          totalWithdrawn: Number(walletStatsResult[0].totalWithdrawn || 0),
          totalRefunded: Number(walletStatsResult[0].totalRefunded || 0),
          totalAdjusted: Number(walletStatsResult[0].totalAdjusted || 0),
          totalSpent: Number(walletStatsResult[0].totalSpent || 0),
        }
      : getEmptyWalletStats();

    return resJson(res, 200, "Wallet summary.", {
      latestPayment,
      stats: walletStats,
      tokenBalance: Number(user.tokenBalance || 0),
      tokenPerUsd: TOKEN_PER_USD,
    });
  } catch (error) {
    next(error);
  }
};

export const getWalletIncomeChart = async (req, res, next) => {
  try {
    const user = req.user;
    const requestedDays =
      req.query.days === "all" ? "all" : Number(req.query.days || 7);
    let buckets = [];
    let startDate = null;

    if (requestedDays === "all") {
      const firstRewardTransaction = await TransactionModel.findOne({
        participants: user._id,
        type: TRANSACTION_TYPES.creatorReward,
        status: TRANSACTION_STATUSES.completed,
      })
        .sort({ createdAt: 1 })
        .select("createdAt")
        .lean();

      if (firstRewardTransaction?.createdAt) {
        buckets = buildIncomeChartBucketsFromDate(firstRewardTransaction.createdAt);
        startDate = new Date(`${buckets[0]?.key || ""}T00:00:00.000Z`);
      } else {
        buckets = buildIncomeChartBuckets(7);
        startDate = new Date(`${buckets[0].key}T00:00:00.000Z`);
      }
    } else {
      buckets = buildIncomeChartBuckets(requestedDays);
      startDate = new Date(`${buckets[0].key}T00:00:00.000Z`);
    }

    if (!buckets.length || !startDate) {
      return resJson(res, 200, "Wallet income chart.", {
        days: requestedDays,
        points: [],
      });
    }

    const chartRows = await TransactionModel.aggregate([
      {
        $match: {
          participants: user._id,
          type: TRANSACTION_TYPES.creatorReward,
          status: TRANSACTION_STATUSES.completed,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          earned: {
            $sum: "$tokenAmount",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const earnedByDay = new Map(
      chartRows.map((row) => [
        String(row._id),
        Number(row.earned || 0),
      ]),
    );
    const points = buckets.map((bucket) => ({
      key: bucket.key,
      earned: earnedByDay.get(bucket.key) ?? 0,
    }));

    return resJson(res, 200, "Wallet income chart.", {
      days: requestedDays,
      points,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const skip = (page - 1) * limit;
    const paymentQuery = {
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
    };

    const [payments, total] = await Promise.all([
      PaymentModel.find(paymentQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments(paymentQuery),
    ]);

    return resJson(res, 200, "Payment history.", {
      payments,
      total,
      currentPage: page,
      totalPage: Math.max(1, Math.ceil(total / limit)),
      limitPerPage: limit,
      hasNextPage: skip + payments.length < total,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

function serializeUniversalWalletActivity(
  transaction,
  currentUserId,
  userMap = new Map(),
  subscriptionMap = new Map(),
  walletTransactionMap = new Map(),
) {
  const currentUserIdString = String(currentUserId || "");
  const actorId = String(transaction.user || "");
  const fromUserId = String(transaction.fromUser || "");
  const toUserId = String(transaction.toUser || "");
  const actorUser = userMap.get(actorId);
  const fromUser = userMap.get(fromUserId);
  const toUser = userMap.get(toUserId);
  const walletTransaction = getWalletTransactionForUser(
    transaction,
    currentUserId,
    walletTransactionMap,
  );

  if (transaction.type === TRANSACTION_TYPES.transfer) {
    const isSender = fromUserId === currentUserIdString;
    const actor = isSender ? fromUser : toUser;
    const counterparty = isSender ? toUser : fromUser;

    return {
      _id: transaction._id,
      transactionId: String(transaction._id || ""),
      shareId: transaction.shareId || null,
      sourceType: "transaction",
      activityType: isSender ? "send" : "receive",
      status: transaction.status,
      tokenAmount: Number(transaction.tokenAmount || 0),
      rateSnapshot: Number(transaction.rateSnapshot || 0) || undefined,
      payCurrency: transaction.payCurrency,
      txHash: transaction.txHash || null,
      plan: transaction.planKey || null,
      description: transaction.description || "Token transfer",
      note: transaction.note || "",
      metadata:
        transaction.metadata && typeof transaction.metadata === "object"
          ? {
              transferId:
                typeof transaction.metadata.transferId === "string"
                  ? transaction.metadata.transferId
                  : undefined,
            }
          : undefined,
      balanceBefore:
        typeof walletTransaction?.balanceBefore === "number"
          ? Number(walletTransaction.balanceBefore || 0)
          : undefined,
      balanceAfter:
        typeof walletTransaction?.balanceAfter === "number"
          ? Number(walletTransaction.balanceAfter || 0)
          : undefined,
      actor: actor
        ? {
            _id: actor._id,
            username: actor.username,
            name: actor.name,
            avatar: actor.avatar || "",
            membership: serializeMembership(
              subscriptionMap.get(String(actor._id)),
            ),
          }
        : null,
      counterparty: counterparty
        ? {
            _id: counterparty._id,
            username: counterparty.username,
            name: counterparty.name,
            avatar: counterparty.avatar || "",
            membership: serializeMembership(
              subscriptionMap.get(String(counterparty._id)),
            ),
          }
        : null,
      createdAt: transaction.createdAt,
      confirmedAt: transaction.confirmedAt || null,
    };
  }

  return {
    _id: transaction._id,
    transactionId: String(transaction._id || ""),
    shareId: transaction.shareId || null,
    sourceType: "transaction",
    activityType:
      transaction.type === TRANSACTION_TYPES.subscription
        ? "subscription"
        : transaction.type === TRANSACTION_TYPES.creatorReward
          ? "reward"
        : transaction.type,
    status: transaction.status,
    amountUsd:
      typeof transaction.amountUsd === "number"
        ? Number(transaction.amountUsd || 0)
        : undefined,
    tokenAmount: Number(transaction.tokenAmount || 0),
    rateSnapshot:
      typeof transaction.rateSnapshot === "number"
        ? Number(transaction.rateSnapshot || 0)
        : undefined,
    payCurrency: transaction.payCurrency,
    txHash: transaction.txHash || null,
    plan: transaction.planKey || null,
    description: transaction.description || "Transaction",
    note: transaction.note || "",
    metadata:
      transaction.metadata && typeof transaction.metadata === "object"
        ? {
            durationDays:
              typeof transaction.metadata.durationDays === "number"
                ? Number(transaction.metadata.durationDays || 0)
                : undefined,
            originalAmountToken:
              typeof transaction.metadata.originalAmountToken === "number"
                ? Number(transaction.metadata.originalAmountToken || 0)
                : undefined,
            discountAmountToken:
              typeof transaction.metadata.discountAmountToken === "number"
                ? Number(transaction.metadata.discountAmountToken || 0)
                : undefined,
            provider:
              typeof transaction.metadata.provider === "string"
                ? transaction.metadata.provider
                : undefined,
            providerReference:
              typeof transaction.metadata.providerReference === "string"
                ? transaction.metadata.providerReference
                : undefined,
            payAddress:
              typeof transaction.metadata.payAddress === "string"
                ? transaction.metadata.payAddress
                : undefined,
            orderId:
              typeof transaction.metadata.orderId === "string"
                ? transaction.metadata.orderId
                : undefined,
            rewardSource:
              typeof transaction.metadata.rewardSource === "string"
                ? transaction.metadata.rewardSource
                : undefined,
            strategyId:
              typeof transaction.metadata.strategyId === "string"
                ? transaction.metadata.strategyId
                : undefined,
            strategyName:
              typeof transaction.metadata.strategyName === "string"
                ? transaction.metadata.strategyName
                : undefined,
            viewerId:
              typeof transaction.metadata.viewerId === "string"
                ? transaction.metadata.viewerId
                : undefined,
            viewerUsername:
              typeof transaction.metadata.viewerUsername === "string"
                ? transaction.metadata.viewerUsername
                : undefined,
          }
        : undefined,
    balanceBefore:
      typeof walletTransaction?.balanceBefore === "number"
        ? Number(walletTransaction.balanceBefore || 0)
        : undefined,
    balanceAfter:
      typeof walletTransaction?.balanceAfter === "number"
        ? Number(walletTransaction.balanceAfter || 0)
        : undefined,
    actor: actorUser
      ? {
          _id: actorUser._id,
          username: actorUser.username,
          name: actorUser.name,
          avatar: actorUser.avatar || "",
          membership: serializeMembership(subscriptionMap.get(actorId)),
        }
      : null,
    counterparty: null,
    createdAt: transaction.createdAt,
    confirmedAt: transaction.confirmedAt || null,
  };
}

export const getWalletActivity = async (req, res, next) => {
  try {
    const user = req.user;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const activityType = String(req.query.activityType || "").trim();
    const skip = (page - 1) * limit;
    const activityQuery = {
      participants: user._id,
    };

    if (activityType === "send") {
      activityQuery.type = TRANSACTION_TYPES.transfer;
      activityQuery.fromUser = user._id;
    } else if (activityType === "receive") {
      activityQuery.type = TRANSACTION_TYPES.transfer;
      activityQuery.toUser = user._id;
    } else if (activityType === "reward") {
      activityQuery.type = TRANSACTION_TYPES.creatorReward;
    } else if (activityType) {
      activityQuery.type = activityType;
    }

    const [transactions, total] = await Promise.all([
      TransactionModel.find(activityQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TransactionModel.countDocuments(activityQuery),
    ]);
    const walletTransactionIds = Array.from(
      new Set(
        transactions.flatMap((transaction) =>
          (Array.isArray(transaction.walletTransactions)
            ? transaction.walletTransactions
            : []
          ).map((value) => String(value)),
        ),
      ),
    );

    const relatedUserIds = Array.from(
      new Set(
        transactions.flatMap((transaction) =>
          [transaction.user, transaction.fromUser, transaction.toUser]
            .filter(Boolean)
            .map((value) => String(value)),
        ),
      ),
    );

    const relatedUsers = relatedUserIds.length
      ? await UserDB.find({
          _id: { $in: relatedUserIds },
        })
          .select("_id username name avatar")
          .lean()
      : [];
    const relatedSubscriptions = relatedUserIds.length
      ? await SubscriptionModel.find({
          user: { $in: relatedUserIds },
        }).lean()
      : [];
    const walletTransactions = walletTransactionIds.length
      ? await WalletTransactionModel.find({
          _id: { $in: walletTransactionIds },
        })
          .select("_id user balanceBefore balanceAfter")
          .lean()
      : [];

    const userMap = new Map(
      relatedUsers.map((user) => [String(user._id), user]),
    );
    const subscriptionMap = new Map(
      relatedSubscriptions.map((subscription) => [
        String(subscription.user),
        subscription,
      ]),
    );
    const walletTransactionMap = new Map(
      walletTransactions.map((walletTransaction) => [
        String(walletTransaction._id),
        walletTransaction,
      ]),
    );
    const activities = transactions.map((transaction) =>
      serializeUniversalWalletActivity(
        transaction,
        user._id,
        userMap,
        subscriptionMap,
        walletTransactionMap,
      ),
    );

    return resJson(res, 200, "Wallet activity.", {
      activities,
      total,
      currentPage: page,
      totalPage: Math.max(1, Math.ceil(total / limit)),
      limitPerPage: limit,
      hasNextPage: skip + activities.length < total,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionReceipt = async (req, res, next) => {
  try {
    const user = req.user;
    const { transactionId } = req.params;
    const transaction = await TransactionModel.findOne({
      _id: transactionId,
      participants: user._id,
    }).lean();

    if (!transaction) {
      throw resError(404, "Transaction not found.");
    }

    const relatedUserIds = Array.from(
      new Set(
        [transaction.user, transaction.fromUser, transaction.toUser]
          .filter(Boolean)
          .map((value) => String(value)),
      ),
    );
    const walletTransactionIds = Array.isArray(transaction.walletTransactions)
      ? transaction.walletTransactions.map((value) => String(value))
      : [];
    const relatedUsers = relatedUserIds.length
      ? await UserDB.find({
          _id: { $in: relatedUserIds },
        })
          .select("_id username name avatar")
          .lean()
      : [];
    const relatedSubscriptions = relatedUserIds.length
      ? await SubscriptionModel.find({
          user: { $in: relatedUserIds },
        }).lean()
      : [];
    const walletTransactions = walletTransactionIds.length
      ? await WalletTransactionModel.find({
          _id: { $in: walletTransactionIds },
        })
          .select("_id user balanceBefore balanceAfter")
          .lean()
      : [];
    const userMap = new Map(
      relatedUsers.map((relatedUser) => [String(relatedUser._id), relatedUser]),
    );
    const subscriptionMap = new Map(
      relatedSubscriptions.map((subscription) => [
        String(subscription.user),
        subscription,
      ]),
    );
    const walletTransactionMap = new Map(
      walletTransactions.map((walletTransaction) => [
        String(walletTransaction._id),
        walletTransaction,
      ]),
    );

    return resJson(res, 200, "Transaction receipt.", {
      transaction: serializeUniversalWalletActivity(
        transaction,
        user._id,
        userMap,
        subscriptionMap,
        walletTransactionMap,
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicTransactionReceipt = async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const transaction = await TransactionModel.findOne({
      shareId,
    }).lean();

    if (!transaction) {
      throw resError(404, "Transaction receipt not found.");
    }

    const relatedUserIds = Array.from(
      new Set(
        [transaction.user, transaction.fromUser, transaction.toUser]
          .filter(Boolean)
          .map((value) => String(value)),
      ),
    );
    const relatedUsers = relatedUserIds.length
      ? await UserDB.find({
          _id: { $in: relatedUserIds },
        })
          .select("_id username name avatar")
          .lean()
      : [];
    const relatedSubscriptions = relatedUserIds.length
      ? await SubscriptionModel.find({
          user: { $in: relatedUserIds },
        }).lean()
      : [];
    const userMap = new Map(
      relatedUsers.map((relatedUser) => [String(relatedUser._id), relatedUser]),
    );
    const subscriptionMap = new Map(
      relatedSubscriptions.map((subscription) => [
        String(subscription.user),
        subscription,
      ]),
    );

    return resJson(res, 200, "Public transaction receipt.", {
      transaction: serializeUniversalWalletActivity(
        transaction,
        transaction.user || transaction.toUser || transaction.fromUser || "",
        userMap,
        subscriptionMap,
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (req, res, next) => {
  try {
    const user = req.user;
    const payment = await PaymentModel.findOne({
      _id: req.params.paymentId,
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
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
