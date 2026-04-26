import { TOKEN_PER_USD } from "../../constants/index.js";
import {
  PAYMENT_PURPOSES,
  WALLET_TRANSACTION_TYPES,
} from "../../constants/subscription.js";
import { PaymentModel } from "../../models/payment.js";
import { SubscriptionModel } from "../../models/subscription.js";
import { UserDB } from "../../models/user.js";
import { WalletTransactionModel } from "../../models/walletTransaction.js";
import { serializeMembership } from "../../services/subscription/serializeMembership.js";
import { resError, resJson } from "../../utils/response.js";

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

function serializeWalletPaymentActivity(payment) {
  return {
    _id: payment._id,
    sourceType: "payment",
    activityType: "deposit",
    status: payment.status,
    amountUsd: Number(payment.requestedAmountUsdt || 0),
    tokenAmount: Number(payment.tokenAmount || 0),
    rateSnapshot: Number(payment.rateSnapshot || TOKEN_PER_USD),
    payCurrency: payment.payCurrency,
    txHash: payment.txHash || null,
    description:
      payment.status === "confirmed"
        ? "Deposit confirmed"
        : payment.status === "pending"
          ? "Deposit pending"
          : payment.status === "cancelled"
            ? "Deposit cancelled"
            : payment.status === "expired"
              ? "Deposit expired"
              : "Deposit",
    createdAt: payment.createdAt,
    confirmedAt: payment.confirmedAt || null,
  };
}

function serializeWalletTokenActivity(
  transaction,
  userMap = new Map(),
  subscriptionMap = new Map(),
) {
  let activityType = transaction.type;
  let description = transaction.description || "Wallet activity";

  if (
    transaction.type === WALLET_TRANSACTION_TYPES.spend &&
    typeof transaction.planKey === "string" &&
    transaction.planKey
  ) {
    activityType = "subscription";
    description = `Subscribed to ${transaction.planKey}`;
  }

  const actorId = String(transaction.user?._id || transaction.user || "");
  const counterpartyId = String(transaction.metadata?.counterpartyUserId || "");
  const actorUser = userMap.get(actorId);
  const counterpartyUser = userMap.get(counterpartyId);

  return {
    _id: transaction._id,
    transactionId: String(transaction._id || ""),
    sourceType: "wallet_transaction",
    activityType,
    status: "completed",
    tokenAmount: Number(transaction.amount || 0),
    balanceBefore: Number(transaction.balanceBefore || 0),
    balanceAfter: Number(transaction.balanceAfter || 0),
    plan: transaction.planKey || null,
    description,
    note: transaction.metadata?.note || "",
    actor: actorUser
      ? {
          _id: actorUser._id,
          username: actorUser.username,
          name: actorUser.name,
          avatar: actorUser.avatar || "",
          membership: serializeMembership(subscriptionMap.get(actorId)),
        }
      : null,
    counterparty: counterpartyUser
      ? {
          _id: counterpartyUser._id,
          username: counterpartyUser.username,
          name: counterpartyUser.name,
          avatar: counterpartyUser.avatar || "",
          membership: serializeMembership(subscriptionMap.get(counterpartyId)),
        }
      : transaction.metadata?.counterpartyUsername
        ? {
            _id: transaction.metadata?.counterpartyUserId || null,
            username: transaction.metadata.counterpartyUsername,
            name: "",
            avatar: "",
            membership: serializeMembership(null),
          }
        : null,
    createdAt: transaction.createdAt,
  };
}

export const getWalletActivity = async (req, res, next) => {
  try {
    const user = req.user;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const combinedLimit = page * limit;
    const skip = (page - 1) * limit;

    const paymentQuery = {
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
    };
    const tokenQuery = {
      user: user._id,
      type: { $ne: WALLET_TRANSACTION_TYPES.deposit },
    };

    const [
      payments,
      paymentsTotal,
      walletTransactions,
      walletTransactionsTotal,
    ] = await Promise.all([
      PaymentModel.find(paymentQuery)
        .sort({ createdAt: -1 })
        .limit(combinedLimit)
        .lean(),
      PaymentModel.countDocuments(paymentQuery),
      WalletTransactionModel.find(tokenQuery)
        .sort({ createdAt: -1 })
        .limit(combinedLimit)
        .lean(),
      WalletTransactionModel.countDocuments(tokenQuery),
    ]);

    const walletUserIds = Array.from(
      new Set(
        walletTransactions.flatMap((transaction) =>
          [
            transaction.user,
            transaction.metadata?.counterpartyUserId,
          ]
            .filter(Boolean)
            .map((value) => String(value)),
        ),
      ),
    );

    const relatedUsers = walletUserIds.length
      ? await UserDB.find({
          _id: { $in: walletUserIds },
        })
          .select("_id username name avatar")
          .lean()
      : [];
    const relatedSubscriptions = walletUserIds.length
      ? await SubscriptionModel.find({
          user: { $in: walletUserIds },
        }).lean()
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

    const total = paymentsTotal + walletTransactionsTotal;
    const activities = [
      ...payments.map(serializeWalletPaymentActivity),
      ...walletTransactions.map((transaction) =>
        serializeWalletTokenActivity(transaction, userMap, subscriptionMap),
      ),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

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
