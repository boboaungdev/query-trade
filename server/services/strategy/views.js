import mongoose from "mongoose";

import { PAID_STRATEGY_VIEW_REWARD_TOKENS } from "../../constants/index.js";
import { WALLET_TRANSACTION_TYPES } from "../../constants/subscription.js";
import { StrategyViewDB } from "../../models/strategyView.js";
import { StrategyDB } from "../../models/strategy.js";
import {
  TransactionModel,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from "../../models/transaction.js";
import { normalizeStrategyAccessType, STRATEGY_ACCESS_TYPES } from "./access.js";
import { recordWalletTransaction } from "../../controllers/subscription/helpers.js";

export async function recordStrategyView({
  strategy,
  viewer,
  viewerPlan,
}) {
  const strategyId = strategy?._id;
  const viewerId = viewer?._id;
  const ownerId = strategy?.user?._id ?? strategy?.user;

  if (!strategyId || !viewerId) {
    return { countedNewView: false, rewardedCreator: false, rewardAmount: 0 };
  }

  if (ownerId && String(ownerId) === String(viewerId)) {
    return { countedNewView: false, rewardedCreator: false, rewardAmount: 0 };
  }

  const session = await mongoose.startSession();
  const rewardAmount = PAID_STRATEGY_VIEW_REWARD_TOKENS;
  const isPaidStrategy =
    normalizeStrategyAccessType(strategy) === STRATEGY_ACCESS_TYPES.paid;
  const canRewardPaidView =
    isPaidStrategy &&
    (viewerPlan === "plus" || viewerPlan === "pro") &&
    rewardAmount > 0;

  let countedNewView = false;
  let rewardedCreator = false;

  try {
    await session.withTransaction(async () => {
      const viewWriteResult = await StrategyViewDB.updateOne(
        {
          strategy: strategyId,
          user: viewerId,
        },
        {
          $setOnInsert: {
            strategy: strategyId,
            user: viewerId,
          },
        },
        {
          upsert: true,
          session,
        },
      );

      countedNewView = Boolean(
        viewWriteResult.upsertedCount || viewWriteResult.upsertedId,
      );

      if (countedNewView) {
        await StrategyDB.updateOne(
          { _id: strategyId },
          { $inc: { "stats.viewCount": 1 } },
          { session },
        );
      }

      if (!canRewardPaidView) {
        return;
      }

      const rewardStamp = new Date();
      const rewardClaimResult = await StrategyViewDB.updateOne(
        {
          strategy: strategyId,
          user: viewerId,
          rewardGrantedAt: null,
        },
        {
          $set: {
            rewardGrantedAt: rewardStamp,
            rewardTokenAmount: rewardAmount,
          },
        },
        {
          session,
        },
      );

      if (!rewardClaimResult.modifiedCount) {
        return;
      }

      const viewerUsername = String(viewer?.username || "").trim();
      const strategyName = String(strategy?.name || "Paid strategy").trim();
      const creatorDescription = viewerUsername
        ? `Earned ${rewardAmount} token from ${strategyName} by @${viewerUsername}`
        : `Earned ${rewardAmount} token from a paid strategy view`;

      const { walletTransaction } = await recordWalletTransaction({
        userId: ownerId,
        type: WALLET_TRANSACTION_TYPES.reward,
        amount: rewardAmount,
        description: creatorDescription,
        metadata: {
          rewardSource: "paid_strategy_view",
          strategyId,
          strategyName,
          viewerId,
          viewerUsername: viewerUsername || null,
        },
        session,
      });

      await TransactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.creatorReward,
            status: TRANSACTION_STATUSES.completed,
            participants: [ownerId],
            user: ownerId,
            fromUser: viewerId,
            toUser: ownerId,
            walletTransactions: [walletTransaction._id],
            tokenAmount: rewardAmount,
            description: creatorDescription,
            metadata: {
              rewardSource: "paid_strategy_view",
              strategyId,
              strategyName,
              viewerId,
              viewerUsername: viewerUsername || null,
            },
            confirmedAt: rewardStamp,
          },
        ],
        { session },
      );

      await StrategyDB.updateOne(
        { _id: strategyId },
        {
          $inc: {
            "stats.earningViewCount": 1,
            "stats.earnedToken": rewardAmount,
          },
        },
        { session },
      );

      rewardedCreator = true;
    });
  } finally {
    await session.endSession();
  }

  return {
    countedNewView,
    rewardedCreator,
    rewardAmount: rewardedCreator ? rewardAmount : 0,
  };
}
