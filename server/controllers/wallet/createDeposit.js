import crypto from "crypto";

import {
  DEPOSIT_PROVIDER,
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
  isMockPaymentMode,
  WALLET_TRANSACTION_TYPES,
} from "../../constants/subscription.js";
import { TOKEN_PER_USD } from "../../constants/index.js";
import { PaymentModel } from "../../models/payment.js";
import {
  TransactionModel,
  TRANSACTION_TYPES,
} from "../../models/transaction.js";
import { getReceiveAddress } from "../../services/payment/bscUsdt.js";
import { resJson } from "../../utils/response.js";
import { recordWalletTransaction } from "../subscription/helpers.js";

export const createDeposit = async (req, res, next) => {
  try {
    const user = req.user;
    const { amountUsdt, payCurrency } = req.body;

    await PaymentModel.updateMany(
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
    await TransactionModel.updateMany(
      {
        user: user._id,
        type: TRANSACTION_TYPES.deposit,
        status: PAYMENT_STATUSES.pending,
      },
      {
        $set: {
          status: PAYMENT_STATUSES.expired,
        },
      },
    );

    const payment = await PaymentModel.create({
      user: user._id,
      purpose: PAYMENT_PURPOSES.tokenTopup,
      requestedAmountUsdt: amountUsdt,
      tokenAmount: amountUsdt * TOKEN_PER_USD,
      rateSnapshot: TOKEN_PER_USD,
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

      const { walletTransaction, tokenBalance } = await recordWalletTransaction(
        {
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
        },
      );
      const transaction = await TransactionModel.create({
        type: TRANSACTION_TYPES.deposit,
        status: payment.status,
        participants: [user._id],
        user: user._id,
        payment: payment._id,
        walletTransactions: [walletTransaction._id],
        tokenAmount: Number(payment.tokenAmount || 0),
        amountUsd: Number(payment.requestedAmountUsdt || 0),
        rateSnapshot: Number(payment.rateSnapshot || TOKEN_PER_USD),
        payCurrency: payment.payCurrency,
        txHash: payment.txHash || undefined,
        description: "Mock token deposit confirmed",
        metadata: {
          provider: payment.provider,
          providerReference: payment.providerReference,
        },
        confirmedAt: payment.confirmedAt,
      });

      return resJson(res, 201, "Mock token deposit confirmed.", {
        payment,
        transaction,
        walletTransaction,
        tokenBalance,
        mock: true,
      });
    }

    const transaction = await TransactionModel.create({
      type: TRANSACTION_TYPES.deposit,
      status: payment.status,
      participants: [user._id],
      user: user._id,
      payment: payment._id,
      tokenAmount: Number(payment.tokenAmount || 0),
      amountUsd: Number(payment.requestedAmountUsdt || 0),
      rateSnapshot: Number(payment.rateSnapshot || TOKEN_PER_USD),
      payCurrency: payment.payCurrency,
      description: "Token deposit created",
      metadata: {
        provider: payment.provider,
        payAddress: payment.payAddress,
        orderId: payment.orderId,
      },
    });

    return resJson(res, 201, "Token deposit created.", {
      payment,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};
