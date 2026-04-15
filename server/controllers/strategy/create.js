import { StrategyDB } from "../../models/strategy.js";
import { IndicatorDB } from "../../models/indicator.js";
import { UserDB } from "../../models/user.js";
import { resError, resJson } from "../../utils/response.js";
import {
  pruneUnusedIndicators,
  validateIndicatorReferences,
} from "../../utils/strategyIndicators.js";

export const createStrategy = async (req, res, next) => {
  try {
    const user = req.user;
    const indicators = pruneUnusedIndicators(req.body);
    const strategyPayload = {
      ...req.body,
      indicators,
    };

    const missingIndicatorKeys = validateIndicatorReferences(strategyPayload);

    if (missingIndicatorKeys.length > 0) {
      throw resError(
        400,
        `Missing indicator definitions for: ${missingIndicatorKeys.join(", ")}`,
      );
    }

    const indicatorIds = indicators.map((item) => item.indicator);
    const uniqueIndicatorIds = [...new Set(indicatorIds)];

    const dbIndicators = await IndicatorDB.find({
      _id: { $in: uniqueIndicatorIds },
    }).select("_id");

    if (dbIndicators.length !== uniqueIndicatorIds.length) {
      throw resError(400, "One or more indicators do not exist!");
    }

    const strategy = await StrategyDB.create({
      ...strategyPayload,
      user: user._id,
    });

    await UserDB.updateOne(
      { _id: user._id },
      { $inc: { "stats.strategyCount": 1 } },
    );

    const populatedStrategy = await StrategyDB.findById(strategy._id).populate(
      "indicators.indicator",
      "name description category",
    );

    return resJson(res, 201, "Strategy created successfully.", {
      strategy: populatedStrategy,
    });
  } catch (error) {
    next(error);
  }
};
