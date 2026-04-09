import { BookmarkDB } from "../../models/bookmark.js";
import { StrategyDB } from "../../models/strategy.js";
import { resError, resJson } from "../../utils/response.js";

export const deleteBookmark = async (req, res, next) => {
  try {
    const user = req.user;
    const { targetType, targetId } = req.params;

    const bookmark = await BookmarkDB.findOneAndDelete({
      user: user._id,
      targetType,
      target: targetId,
    });

    if (!bookmark) {
      throw resError(404, "Bookmark not found!");
    }

    if (targetType === "strategy") {
      await StrategyDB.updateOne(
        { _id: targetId, "stats.bookmarkCount": { $gt: 0 } },
        { $inc: { "stats.bookmarkCount": -1 } },
      );
    }

    return resJson(res, 200, "Bookmark removed successfully.");
  } catch (error) {
    next(error);
  }
};
