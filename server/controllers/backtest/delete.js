import { BacktestDB } from "../../models/backtest.js";
import { UserDB } from "../../models/user.js";
import { resError, resJson } from "../../utils/response.js";

export const deleteBacktest = async (req, res, next) => {
  try {
    const user = req.user;
    const { backtestId } = req.params;

    const backtest = await BacktestDB.findOneAndDelete({
      _id: backtestId,
      user: user._id,
    });

    if (!backtest) {
      throw resError(
        404,
        "Backtest not found or you are not allowed to delete it!",
      );
    }

    await UserDB.updateOne(
      { _id: user._id, "stats.backtestCount": { $gt: 0 } },
      { $inc: { "stats.backtestCount": -1 } },
    );

    return resJson(res, 200, "Backtest deleted successfully.");
  } catch (error) {
    next(error);
  }
};
