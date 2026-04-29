import { StrategyViewDB } from "../../models/strategyView.js";
import { StrategyDB } from "../../models/strategy.js";

export async function recordUniqueStrategyView({ strategyId, viewerId, ownerId }) {
  if (!strategyId || !viewerId) {
    return false;
  }

  if (ownerId && String(ownerId) === String(viewerId)) {
    return false;
  }

  try {
    await StrategyViewDB.create({
      strategy: strategyId,
      user: viewerId,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return false;
    }

    throw error;
  }

  await StrategyDB.updateOne(
    { _id: strategyId },
    { $inc: { "stats.viewCount": 1 } },
  );

  return true;
}
