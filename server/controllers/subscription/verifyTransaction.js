import { PAYMENT_STATUSES } from "../../constants/subscription.js";
import { PaymentDB } from "../../models/payment.js";
import { verifyUsdtBscPayment } from "../../services/bscPayment.js";
import { resError, resJson } from "../../utils/response.js";
import { activateSubscription } from "./helpers.js";

export const verifyTransaction = async (req, res, next) => {
  try {
    const user = req.user;
    const { paymentId } = req.params;
    const txHash = req.body.txHash.toLowerCase();

    const payment = await PaymentDB.findOne({
      _id: paymentId,
      user: user._id,
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
      throw resError(410, "Payment request expired. Create a new one.");
    }

    if (payment.status !== PAYMENT_STATUSES.pending) {
      throw resError(400, "Payment cannot be verified.");
    }

    const usedPayment = await PaymentDB.findOne({
      txHash,
      _id: { $ne: payment._id },
    }).lean();

    if (usedPayment) {
      throw resError(409, "This transaction hash was already used.");
    }

    const verification = await verifyUsdtBscPayment({
      txHash,
      expectedAmount:
        payment.payAmount ||
        payment.planSnapshot?.finalAmountUsd ||
        payment.amountUsd,
      paymentCreatedAt: payment.createdAt,
    });

    payment.status = PAYMENT_STATUSES.confirmed;
    payment.providerStatus = "manual_confirmed";
    payment.txHash = txHash;
    payment.txFrom = verification.from;
    payment.txBlockNumber = verification.blockNumber;
    payment.actuallyPaid = verification.amount;
    payment.confirmedAt = new Date();
    payment.rawPayload = {
      ...(payment.rawPayload || {}),
      verification,
    };
    await payment.save();

    const subscription = await activateSubscription(payment);

    return resJson(res, 200, "Transaction verified.", {
      payment,
      subscription,
    });
  } catch (error) {
    if (error?.code === 11000) {
      next(resError(409, "This transaction hash was already used."));
      return;
    }

    next(error);
  }
};
