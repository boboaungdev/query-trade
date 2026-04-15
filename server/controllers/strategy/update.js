import { StrategyDB } from "../../models/strategy.js";
import { IndicatorDB } from "../../models/indicator.js";
import { resError, resJson } from "../../utils/response.js";
import {
  pruneUnusedIndicators,
  validateIndicatorReferences,
} from "../../utils/strategyIndicators.js";

export const updateStrategy = async (req, res, next) => {
  try {
    const user = req.user;
    const { strategyId } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      throw resError(400, "Need something to update!");
    }

    const existingStrategy = await StrategyDB.findOne({
      _id: strategyId,
      user: user._id,
    }).lean();

    if (!existingStrategy) {
      throw resError(
        404,
        "Strategy not found or can't modifine strategy of other users!",
      );
    }

    const nextStrategy = {
      ...existingStrategy,
      ...req.body,
      entry: {
        ...existingStrategy.entry,
        ...req.body.entry,
      },
    };

    const cleanedIndicators = pruneUnusedIndicators(nextStrategy);
    const strategyUpdate = {
      ...req.body,
      indicators: cleanedIndicators,
    };

    const strategyForValidation = {
      ...nextStrategy,
      indicators: cleanedIndicators,
    };

    const missingIndicatorKeys = validateIndicatorReferences(
      strategyForValidation,
    );

    if (missingIndicatorKeys.length > 0) {
      throw resError(
        400,
        `Missing indicator definitions for: ${missingIndicatorKeys.join(", ")}`,
      );
    }

    if (strategyUpdate.indicators) {
      const indicatorIds = strategyUpdate.indicators.map(
        (item) => item.indicator,
      );
      const uniqueIndicatorIds = [...new Set(indicatorIds)];

      const dbIndicators = await IndicatorDB.find({
        _id: { $in: uniqueIndicatorIds },
      }).select("_id");

      if (dbIndicators.length !== uniqueIndicatorIds.length) {
        throw resError(400, "One or more indicators do not exist.");
      }
    }

    const updatedStrategy = await StrategyDB.findOneAndUpdate(
      {
        _id: strategyId,
        user: user._id,
      },
      strategyUpdate,
      {
        runValidators: true,
        returnDocument: "after",
      },
    ).populate("indicators.indicator", "name description category");

    return resJson(res, 200, "Strategy updated successfully.", {
      strategy: updatedStrategy,
    });
  } catch (error) {
    next(error);
  }
};
