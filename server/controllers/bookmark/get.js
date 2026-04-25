import { resJson } from "../../utils/response.js";
import { BacktestDB } from "../../models/backtest.js";
import { BookmarkDB } from "../../models/bookmark.js";
import { SubscriptionModel } from "../../models/subscription.js";
import { serializePublicUser } from "../../services/user/serializePublicUser.js";

const bookmarkTargetMatchesSearch = (bookmark, searchValue) => {
  const target = bookmark?.target;
  const normalizedSearch = searchValue.trim().toLowerCase();

  if (!target || !normalizedSearch) {
    return true;
  }

  const user =
    typeof target.user === "object" && target.user !== null
      ? target.user
      : null;
  const strategy =
    typeof target.strategy === "object" && target.strategy !== null
      ? target.strategy
      : null;

  const candidates =
    bookmark.targetType === "backtest"
      ? [
          target.symbol,
          target.timeframe,
          strategy?.name,
          user?.name,
          user?.username,
        ]
      : [target.name, target.description, user?.name, user?.username];

  return candidates.some(
    (value) =>
      typeof value === "string" &&
      value.toLowerCase().includes(normalizedSearch),
  );
};

const populateBookmarkTargets = async (bookmarks) => {
  await BookmarkDB.populate(bookmarks, {
    path: "target",
    populate: {
      path: "user",
      select: "name username avatar",
    },
  });

  const backtestBookmarks = bookmarks.filter(
    (bookmark) => bookmark.targetType === "backtest" && bookmark.target,
  );

  if (backtestBookmarks.length > 0) {
    await BacktestDB.populate(backtestBookmarks, {
      path: "target.strategy",
      select: "name isPublic",
    });
  }

  return bookmarks;
};

const attachBookmarkUserMembership = async (bookmarks) => {
  const targetUsers = bookmarks
    .map((bookmark) =>
      typeof bookmark.target?.user === "object" &&
      bookmark.target?.user !== null
        ? bookmark.target.user
        : null,
    )
    .filter((user) => user?._id);

  if (targetUsers.length === 0) {
    return bookmarks;
  }

  const subscriptions = await SubscriptionModel.find({
    user: { $in: targetUsers.map((user) => user._id) },
  })
    .select("user plan currentPeriodEnd")
    .lean();

  const subscriptionMap = new Map(
    subscriptions.map((subscription) => [
      String(subscription.user),
      subscription,
    ]),
  );

  for (const bookmark of bookmarks) {
    if (
      typeof bookmark.target?.user === "object" &&
      bookmark.target?.user !== null &&
      bookmark.target.user._id
    ) {
      bookmark.target.user = serializePublicUser(bookmark.target.user, {
        subscription: subscriptionMap.get(String(bookmark.target.user._id)),
      });
    }
  }

  return bookmarks;
};

export const getBookmarks = async (req, res, next) => {
  try {
    const user = req.user;
    const { page, limit, targetType, sortBy, order, search } =
      req.validatedQuery;

    const filter = {
      user: user._id,
    };

    if (targetType) {
      filter.targetType = targetType;
    }

    const searchValue = search?.trim();

    const sortOrder = order === "desc" ? -1 : 1;

    const staleCandidates = await BookmarkDB.find(filter)
      .select("_id")
      .populate("target", "_id")
      .lean();

    const staleBookmarkIds = staleCandidates
      .filter((bookmark) => !bookmark.target)
      .map((bookmark) => bookmark._id);

    if (staleBookmarkIds.length > 0) {
      await BookmarkDB.deleteMany({
        _id: { $in: staleBookmarkIds },
      });
    }

    const skip = (page - 1) * limit;
    let bookmarks = [];
    let total = 0;

    if (searchValue) {
      const allBookmarks = await BookmarkDB.find(filter)
        .sort({ [sortBy]: sortOrder })
        .lean();

      await populateBookmarkTargets(allBookmarks);
      await attachBookmarkUserMembership(allBookmarks);

      const matchedBookmarks = allBookmarks.filter((bookmark) =>
        bookmarkTargetMatchesSearch(bookmark, searchValue),
      );

      total = matchedBookmarks.length;
      bookmarks = matchedBookmarks.slice(skip, skip + limit);
    } else {
      [bookmarks, total] = await Promise.all([
        BookmarkDB.find(filter)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .lean(),
        BookmarkDB.countDocuments(filter),
      ]);

      await populateBookmarkTargets(bookmarks);
      await attachBookmarkUserMembership(bookmarks);
    }

    const totalPage = Math.ceil(total / limit);

    return resJson(res, 200, "Bookmarks fetched successfully.", {
      total,
      totalPage,
      currentPage: page,
      limitPerPage: limit,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
      bookmarks,
    });
  } catch (error) {
    next(error);
  }
};
