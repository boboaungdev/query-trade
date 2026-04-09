import { StrategyDB } from "../../models/strategy.js";
import { UserDB } from "../../models/user.js";
import { resError, resJson } from "../../utils/response.js";

export const deleteStrategy = async (req, res, next) => {
  try {
    const user = req.user;
    const { strategyId } = req.params;

    const strategy = await StrategyDB.findOneAndDelete({
      _id: strategyId,
      user: user._id,
    });

    if (!strategy) {
      throw resError(
        404,
        "Strategy not found or you are not allowed to delete it!",
      );
    }

    await UserDB.updateOne(
      { _id: user._id, "stats.strategyCount": { $gt: 0 } },
      { $inc: { "stats.strategyCount": -1 } },
    );

    return resJson(res, 200, "Strategy deleted successfully.",);
  } catch (error) {
    next(error);
  }
};
