import crypto from "crypto";

import {
  DEPOSIT_PROVIDER,
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
  isMockPaymentMode,
  WALLET_TRANSACTION_TYPES,
} from "../../constants/subscription.js";
import { TOKEN_PER_USDT } from "../../constants/index.js";
import { PaymentDB } from "../../models/payment.js";
import { getReceiveAddress } from "../../services/payment/bscUsdt.js";
import { resJson } from "../../utils/response.js";
import { recordWalletTransaction } from "./helpers.js";

export const createDeposit = async (req, res, next) => {
  try {
    const user = req.user;
    const { amountUsdt, payCurrency } = req.body;

    await PaymentDB.updateMany(
      {
        user: user._id,
        purpose: PAYMENT_PURPOSES.tokenTopup,
        status: PAYMENT_STATUSES.pending,
      },
      {
        $set: {
          status: PAYMENT_STATUSES.expired,
          providerStatus: "manual_replaced",
        },
      },
    );

    const payment = await PaymentDB.create({
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
      requestedAmountUsdt: amountUsdt,
      tokenAmount: amountUsdt * TOKEN_PER_USDT,
      rateSnapshot: TOKEN_PER_USDT,
      status: PAYMENT_STATUSES.pending,
      provider: DEPOSIT_PROVIDER,
      orderId: `qt_${user._id}_${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}`,
      payCurrency,
      payAddress: getReceiveAddress(),
      payCurrencyAmount: amountUsdt,
      rawPayload: {
        provider: DEPOSIT_PROVIDER,
        message: "Waiting for user-submitted USDT BEP20 transaction hash.",
      },
    });

    if (isMockPaymentMode()) {
      payment.status = PAYMENT_STATUSES.confirmed;
      payment.providerStatus = "mock_confirmed";
      payment.providerReference = `mock_${payment._id}`;
      payment.txFrom = "mock_wallet";
      payment.confirmedAt = new Date();
      payment.confirmedAmountUsdt = amountUsdt;
      payment.rawPayload = {
        ...(payment.rawPayload || {}),
        provider: "dev_mock",
        message: "Deposit was auto-confirmed by mock payment mode.",
      };
      await payment.save();

      const { walletTransaction, tokenBalance } = await recordWalletTransaction({
        userId: user._id,
        type: WALLET_TRANSACTION_TYPES.deposit,
        amount: payment.tokenAmount,
        paymentId: payment._id,
        description: "Mock token deposit confirmed",
        metadata: {
          amountUsdt: payment.requestedAmountUsdt,
          rateSnapshot: payment.rateSnapshot,
          providerReference: payment.providerReference,
        },
      });

      return resJson(res, 201, "Mock token deposit confirmed.", {
        payment,
        walletTransaction,
        tokenBalance,
        mock: true,
      });
    }

    return resJson(res, 201, "Token deposit created.", {
      payment,
    });
  } catch (error) {
    next(error);
  }
};
