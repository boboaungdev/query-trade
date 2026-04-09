import { StrategyDB } from "../../models/strategy.js";
import { IndicatorDB } from "../../models/indicator.js";
import { resError, resJson } from "../../utils/response.js";

export const updateStrategy = async (req, res, next) => {
  try {
    const user = req.user;
    const { strategyId } = req.params;

    // check strategy exists and belongs to user
    if (
      !(await StrategyDB.exists({
        _id: strategyId,
        user: user._id,
      }))
    ) {
      throw resError(
        404,
        "Strategy not found or can't modifine strategy of other users!",
      );
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      throw resError(400, "Need something to update!");
    }

    if (req.body.indicators) {
      const indicatorIds = req.body.indicators.map((item) => item.indicator);
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
      req.body,
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
