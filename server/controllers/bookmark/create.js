import { getBookmarkTargetName, getTargetModel } from "./helpers.js";
import { BookmarkDB } from "../../models/bookmark.js";
import { StrategyDB } from "../../models/strategy.js";
import { resError, resJson } from "../../utils/response.js";

export const createBookmark = async (req, res, next) => {
  try {
    const user = req.user;
    const { targetType, target } = req.body;

    const TargetDB = getTargetModel(targetType);
    const targetDoc = await TargetDB.findById(target)
      .select("name symbol timeframe")
      .lean();

    if (!targetDoc) {
      throw resError(404, `${targetType} not found!`);
    }

    const existingBookmark = await BookmarkDB.findOne({
      user: user._id,
      targetType,
      target,
    }).lean();

    if (existingBookmark) {
      return resJson(res, 200, "Already bookmarked.", {
        bookmark: existingBookmark,
      });
    }

    const bookmark = await BookmarkDB.create({
      target,
      targetType,
      user: user._id,
      name: getBookmarkTargetName(targetType, targetDoc),
    });

    if (targetType === "strategy") {
      await StrategyDB.updateOne(
        { _id: target },
        { $inc: { "stats.bookmarkCount": 1 } },
      );
    }

    const populatedBookmark = await BookmarkDB.findById(bookmark._id)
      .populate("user", "name username")
      .populate({
        path: "target",
        populate: {
          path: "user",
          select: "username",
        },
      })
      .lean();

    return resJson(res, 201, "Bookmarked successfully.", {
      bookmark: populatedBookmark,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const user = req.user;
      const { targetType, target } = req.body;

      const existingBookmark = await BookmarkDB.findOne({
        user: user._id,
        targetType,
        target,
      }).lean();

      return resJson(res, 200, "Already bookmarked.", {
        bookmark: existingBookmark,
      });
    }

    next(error);
  }
};
