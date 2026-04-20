import { UserDB } from "../../models/user.js";
import { StrategyDB } from "../../models/strategy.js";
import { BookmarkDB } from "../../models/bookmark.js";
import { FollowDB } from "../../models/follow.js";
import { resError, resJson } from "../../utils/response.js";

export const getStrategyById = async (req, res, next) => {
  try {
    const user = req.user;
    const { strategyId } = req.params;

    const strategy = await StrategyDB.findOneAndUpdate(
      { _id: strategyId },
      { $inc: { "stats.viewCount": 1 } },
      { returnDocument: "after" },
    )
      .populate([
        { path: "indicators.indicator", select: "name description category" },
        {
          path: "user",
          select:
            "name username avatar stats.followerCount stats.strategyCount stats.backtestCount",
        },
      ])
      .lean();

    if (!strategy) {
      throw resError(404, "Strategy not found!");
    }

    if (user?._id) {
      const [bookmark, follow] = await Promise.all([
        BookmarkDB.findOne({
          user: user._id,
          targetType: "strategy",
          target: strategy._id,
        })
          .select("_id")
          .lean(),
        strategy.user?._id && String(strategy.user._id) !== String(user._id)
          ? FollowDB.findOne({
              follower: user._id,
              following: strategy.user._id,
            })
              .select("_id")
              .lean()
          : null,
      ]);

      strategy.isBookmarked = Boolean(bookmark);
      if (strategy.user) {
        strategy.user.isFollowing = Boolean(follow);
      }
    }

    return resJson(res, 200, "Success single strategy fetched by ID.", {
      strategy,
    });
  } catch (error) {
    next(error);
  }
};

export const getStrategies = async (req, res, next) => {
  try {
    const user = req.user;
    const { page, limit, search, sortBy, order, source, isPublic } =
      req.validatedQuery;

    const skip = (page - 1) * limit;

    const andConditions = [];

    if (source === "bookmarked" && user?._id) {
      const bookmarkedStrategyIds = await BookmarkDB.find({
        user: user._id,
        targetType: "strategy",
      })
        .select("target")
        .lean();

      andConditions.push({
        _id: {
          $in: bookmarkedStrategyIds.map((bookmark) => bookmark.target),
        },
      });
    }

    if (source === "mine" && user?._id) {
      andConditions.push({ user: user._id });
    } else if (isPublic === true && source === "all") {
      if (user?._id) {
        andConditions.push({ $or: [{ isPublic: true }, { user: user._id }] });
      } else {
        andConditions.push({ isPublic: true });
      }
    } else if (typeof isPublic === "boolean") {
      andConditions.push({ isPublic });
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      const matchingUsers = await UserDB.find({
        $or: [{ name: regex }, { username: regex }],
      })
        .select("_id")
        .lean();

      const searchOrConditions = [{ name: regex }];
      if (matchingUsers.length) {
        searchOrConditions.push({
          user: { $in: matchingUsers.map((matchedUser) => matchedUser._id) },
        });
      }

      andConditions.push({ $or: searchOrConditions });
    }

    const filter = andConditions.length ? { $and: andConditions } : {};

    const sortOrder = order === "desc" ? -1 : 1;

    const strategyQuery =
      sortBy === "popular"
        ? StrategyDB.aggregate([
            { $match: filter },
            // popular = total views + total bookmarks
            {
              $addFields: {
                popular: {
                  $add: ["$stats.viewCount", "$stats.bookmarkCount"],
                },
              },
            },
            { $sort: { popular: sortOrder } },
            { $skip: skip },
            { $limit: limit },
          ]).then((items) =>
            StrategyDB.populate(items, [
              {
                path: "indicators.indicator",
                select: "name description category",
              },
              { path: "user", select: "name username avatar" },
            ]),
          )
        : StrategyDB.find(filter)
            .populate("indicators.indicator", "name description category")
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate("user", "name username avatar")
            .lean();

    const [strategies, total] = await Promise.all([
      strategyQuery,
      StrategyDB.countDocuments(filter),
    ]);

    let bookmarkedStrategyIds = [];
    if (user?._id && strategies.length > 0) {
      const bookmarks = await BookmarkDB.find({
        user: user._id,
        targetType: "strategy",
        target: { $in: strategies.map((strategy) => strategy._id) },
      })
        .select("target")
        .lean();

      bookmarkedStrategyIds = bookmarks.map((bookmark) =>
        String(bookmark.target),
      );
    }

    const strategiesWithBookmarkState = strategies.map((strategy) => ({
      ...strategy,
      isBookmarked: bookmarkedStrategyIds.includes(String(strategy._id)),
    }));

    const totalPage = Math.ceil(total / limit);

    return resJson(res, 200, "All strategies fetched successfully.", {
      total,
      totalPage,
      currentPage: page,
      limitPerPage: limit,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
      strategies: strategiesWithBookmarkState,
    });
  } catch (error) {
    next(error);
  }
};
