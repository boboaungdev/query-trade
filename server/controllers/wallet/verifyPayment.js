import {
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
  WALLET_TRANSACTION_TYPES,
} from "../../constants/subscription.js";
import { PaymentModel } from "../../models/payment.js";
import { verifyUsdtBscPayment } from "../../services/payment/bscUsdt.js";
import { resError, resJson } from "../../utils/response.js";
import { recordWalletTransaction } from "../subscription/helpers.js";

export const verifyPayment = async (req, res, next) => {
  try {
    const user = req.user;
    const { paymentId } = req.params;
    const txHash = req.body.txHash.toLowerCase();

    const payment = await PaymentModel.findOne({
      _id: paymentId,
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
    });

    if (!payment) {
      throw resError(404, "Payment not found.");
    }

    if (payment.status === PAYMENT_STATUSES.confirmed) {
      return resJson(res, 200, "Payment already confirmed.", {
        payment,
      });
    }

    if (payment.status === PAYMENT_STATUSES.expired) {
      throw resError(410, "Deposit request expired. Create a new one.");
    }

    if (payment.status !== PAYMENT_STATUSES.pending) {
      throw resError(400, "Payment cannot be verified.");
    }

    const usedPayment = await PaymentModel.findOne({
      txHash,
      _id: { $ne: payment._id },
    }).lean();

    if (usedPayment) {
      throw resError(409, "This transaction hash was already used.");
    }

    const verification = await verifyUsdtBscPayment({
      txHash,
      expectedAmount: payment.payCurrencyAmount || payment.requestedAmountUsdt,
      paymentCreatedAt: payment.createdAt,
    });

    payment.status = PAYMENT_STATUSES.confirmed;
    payment.providerStatus = "manual_confirmed";
    payment.txHash = txHash;
    payment.txFrom = verification.from;
    payment.txBlockNumber = verification.blockNumber;
    payment.confirmedAmountUsdt = verification.amount;
    payment.confirmedAt = new Date();
    payment.rawPayload = {
      ...(payment.rawPayload || {}),
      verification,
    };
    await payment.save();

    const { walletTransaction, tokenBalance } = await recordWalletTransaction({
      userId: user._id,
      type: WALLET_TRANSACTION_TYPES.deposit,
      amount: payment.tokenAmount,
      paymentId: payment._id,
      description: "Token deposit confirmed",
      metadata: {
        txHash,
        amountUsdt: payment.requestedAmountUsdt,
        rateSnapshot: payment.rateSnapshot,
      },
    });

    return resJson(res, 200, "Deposit verified and token credited.", {
      payment,
      walletTransaction,
      tokenBalance,
    });
  } catch (error) {
    if (error?.code === 11000) {
      next(resError(409, "This transaction hash was already used."));
      return;
    }

    next(error);
  }
};
