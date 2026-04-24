import { TOKEN_PER_USDT } from "../../constants/index.js";
import {
  PAYMENT_CURRENCIES,
  PAYMENT_PURPOSES,
  TOKEN_TRANSACTION_TYPES,
} from "../../constants/subscription.js";
import { PaymentDB } from "../../models/payment.js";
import { TokenTransactionDB } from "../../models/tokenTransaction.js";
import { SubscriptionPlanDB } from "../../models/subscriptionPlan.js";
import { serializePlan } from "../../services/subscription/calculatePlanPricing.js";
import { resError, resJson } from "../../utils/response.js";
import { getEffectiveSubscription } from "./helpers.js";

export const getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlanDB.find({ isActive: true })
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
    const latestPayment = await PaymentDB.findOne({
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
    })
      .sort({ createdAt: -1 })
      .lean();

    return resJson(res, 200, "Current subscription.", {
      subscription,
      latestPayment,
      tokenBalance: Number(user.tokenBalance || 0),
      tokenPerUsdt: TOKEN_PER_USDT,
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
    const [payments, total] = await Promise.all([
      PaymentDB.find({
        user: user._id,
        purpose: PAYMENT_PURPOSES.tokenTopup,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentDB.countDocuments({
        user: user._id,
        purpose: PAYMENT_PURPOSES.tokenTopup,
      }),
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
    amountUsd: Number(payment.amountUsdt || 0),
    tokenAmount: Number(payment.tokenAmount || 0),
    rateSnapshot: Number(payment.rateSnapshot || TOKEN_PER_USDT),
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
              : "Deposit failed",
    createdAt: payment.createdAt,
    confirmedAt: payment.confirmedAt || null,
  };
}

function serializeWalletTokenActivity(transaction) {
  let activityType = transaction.type;
  let description = transaction.description || "Wallet activity";

  if (
    transaction.type === TOKEN_TRANSACTION_TYPES.spend &&
    typeof transaction.plan === "string" &&
    transaction.plan
  ) {
    activityType = "subscription";
    description = `Subscribed to ${transaction.plan}`;
  }

  return {
    _id: transaction._id,
    sourceType: "token_transaction",
    activityType,
    status: "completed",
    tokenAmount: Number(transaction.amount || 0),
    balanceBefore: Number(transaction.balanceBefore || 0),
    balanceAfter: Number(transaction.balanceAfter || 0),
    plan: transaction.plan || null,
    description,
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
      type: { $ne: TOKEN_TRANSACTION_TYPES.deposit },
    };

    const [payments, paymentsTotal, tokenTransactions, tokenTransactionsTotal] =
      await Promise.all([
        PaymentDB.find(paymentQuery)
          .sort({ createdAt: -1 })
          .limit(combinedLimit)
          .lean(),
        PaymentDB.countDocuments(paymentQuery),
        TokenTransactionDB.find(tokenQuery)
          .sort({ createdAt: -1 })
          .limit(combinedLimit)
          .lean(),
        TokenTransactionDB.countDocuments(tokenQuery),
      ]);

    const total = paymentsTotal + tokenTransactionsTotal;
    const activities = [
      ...payments.map(serializeWalletPaymentActivity),
      ...tokenTransactions.map(serializeWalletTokenActivity),
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
    const payment = await PaymentDB.findOne({
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
