import { TOKEN_PER_USD } from "../../constants/index.js";
import { PAYMENT_PURPOSES } from "../../constants/subscription.js";
import { PaymentModel } from "../../models/payment.js";
import { SubscriptionModel } from "../../models/subscription.js";
import {
  TransactionModel,
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

export const getWalletSummary = async (req, res, next) => {
  try {
    const user = req.user;
    const latestPayment = await PaymentModel.findOne({
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
    })
      .sort({ createdAt: -1 })
      .lean();

    return resJson(res, 200, "Wallet summary.", {
      latestPayment,
      tokenBalance: Number(user.tokenBalance || 0),
      tokenPerUsd: TOKEN_PER_USD,
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
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      TransactionModel.find({
        participants: user._id,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TransactionModel.countDocuments({
        participants: user._id,
      }),
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
