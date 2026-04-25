import {
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
} from "../../constants/subscription.js";
import { PaymentModel } from "../../models/payment.js";
import { resError, resJson } from "../../utils/response.js";

export const cancelPayment = async (req, res, next) => {
  try {
    const user = req.user;
    const { paymentId } = req.params;

    const payment = await PaymentModel.findOne({
      _id: paymentId,
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
    });

    if (!payment) {
      throw resError(404, "Payment not found.");
    }

    if (payment.status === PAYMENT_STATUSES.confirmed) {
      throw resError(400, "Confirmed payment cannot be cancelled.");
    }

    if (payment.status !== PAYMENT_STATUSES.pending) {
      return resJson(res, 200, "Payment already closed.", {
        payment,
      });
    }

    payment.status = PAYMENT_STATUSES.cancelled;
    payment.providerStatus = "manual_cancelled";
    payment.rawPayload = {
      ...(payment.rawPayload || {}),
      cancelledAt: new Date().toISOString(),
      cancelledBy: "user",
      message: "Token deposit request cancelled by user.",
    };
    await payment.save();

    return resJson(res, 200, "Payment cancelled.", {
      payment,
    });
  } catch (error) {
    next(error);
  }
};
