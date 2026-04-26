import crypto from "crypto";

import mongoose from "mongoose";

import { WALLET_TRANSACTION_TYPES } from "../../constants/subscription.js";
import { UserDB } from "../../models/user.js";
import {
  TransactionModel,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
} from "../../models/transaction.js";
import { WalletTransactionModel } from "../../models/walletTransaction.js";
import { resError, resJson } from "../../utils/response.js";

export const createTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const sender = req.user;
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();
    const amount = Number(req.body.amount || 0);
    const note = String(req.body.note || "").trim();

    if (username === String(sender.username || "").toLowerCase()) {
      throw resError(400, "You cannot send token to your own username.");
    }

    const recipient = await UserDB.findOne({ username })
      .select("_id username name")
      .lean();

    if (!recipient) {
      throw resError(404, "Recipient username not found.");
    }

    const transferId = `transfer_${Date.now()}_${crypto
      .randomBytes(6)
      .toString("hex")}`;

    let senderTransaction = null;
    let recipientTransaction = null;
    let transaction = null;
    let senderBalance = 0;

    await session.withTransaction(async () => {
      const senderBefore = await UserDB.findOneAndUpdate(
        {
          _id: sender._id,
          tokenBalance: { $gte: amount },
        },
        {
          $inc: {
            tokenBalance: -amount,
          },
        },
        {
          session,
          returnDocument: "before",
        },
      )
        .select("tokenBalance")
        .lean();

      if (!senderBefore) {
        throw resError(400, "Insufficient token balance.");
      }

      const recipientBefore = await UserDB.findOneAndUpdate(
        {
          _id: recipient._id,
        },
        {
          $inc: {
            tokenBalance: amount,
          },
        },
        {
          session,
          returnDocument: "before",
        },
      )
        .select("tokenBalance")
        .lean();

      if (!recipientBefore) {
        throw resError(404, "Recipient username not found.");
      }

      const senderBalanceBefore = Number(senderBefore.tokenBalance || 0);
      const senderBalanceAfter = senderBalanceBefore - amount;
      const recipientBalanceBefore = Number(recipientBefore.tokenBalance || 0);
      const recipientBalanceAfter = recipientBalanceBefore + amount;
      const sharedMetadata = {
        transferId,
        note,
      };

      [senderTransaction] = await WalletTransactionModel.create(
        [
          {
            user: sender._id,
            type: WALLET_TRANSACTION_TYPES.send,
            amount,
            balanceBefore: senderBalanceBefore,
            balanceAfter: senderBalanceAfter,
            description: note
              ? `Sent to @${recipient.username}: ${note}`
              : `Sent token to @${recipient.username}`,
            metadata: {
              ...sharedMetadata,
              counterpartyUserId: recipient._id,
              counterpartyUsername: recipient.username,
              direction: "outgoing",
            },
          },
        ],
        {
          session,
        },
      );

      [recipientTransaction] = await WalletTransactionModel.create(
        [
          {
            user: recipient._id,
            type: WALLET_TRANSACTION_TYPES.receive,
            amount,
            balanceBefore: recipientBalanceBefore,
            balanceAfter: recipientBalanceAfter,
            description: note
              ? `Received from @${sender.username}: ${note}`
              : `Received token from @${sender.username}`,
            metadata: {
              ...sharedMetadata,
              counterpartyUserId: sender._id,
              counterpartyUsername: sender.username,
              direction: "incoming",
            },
          },
        ],
        {
          session,
        },
      );

      [transaction] = await TransactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.transfer,
            status: TRANSACTION_STATUSES.completed,
            participants: [sender._id, recipient._id],
            fromUser: sender._id,
            toUser: recipient._id,
            walletTransactions: [
              senderTransaction._id,
              recipientTransaction._id,
            ],
            tokenAmount: Number(amount || 0),
            description: note
              ? `Transfer to @${recipient.username}: ${note}`
              : `Transfer to @${recipient.username}`,
            note,
            metadata: {
              transferId,
            },
          },
        ],
        {
          session,
        },
      );

      senderBalance = senderBalanceAfter;
    });

    return resJson(res, 201, "Token sent successfully.", {
      transfer: {
        transaction,
        senderTransaction,
        recipientTransaction,
        recipient: {
          _id: recipient._id,
          username: recipient.username,
          name: recipient.name,
        },
      },
      tokenBalance: senderBalance,
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};
