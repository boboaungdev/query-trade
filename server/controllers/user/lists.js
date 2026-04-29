import mongoose from "mongoose";

import { FollowDB } from "../../models/follow.js";
import { StrategyDB } from "../../models/strategy.js";
import { BacktestDB } from "../../models/backtest.js";
import { BookmarkDB } from "../../models/bookmark.js";
import { SubscriptionModel } from "../../models/subscription.js";
import { UserDB } from "../../models/user.js";
import { serializePublicUser } from "../../services/user/serializePublicUser.js";
import { resError, resJson } from "../../utils/response.js";
import {
  buildPaginationResult,
  getPagination,
} from "../../utils/pagination.js";
import {
  getStrategyAccessState,
  getViewerPlan,
} from "../../services/strategy/access.js";
import { getEffectiveSubscription } from "../subscription/helpers.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function getProfileUserByUsername(username) {
  const profileUser = await UserDB.findOne({ username })
    .select("_id username")
    .lean();

  if (!profileUser) {
    throw resError(404, "User not found!");
  }

  return profileUser;
}

export const getUserFollows = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { type, search, page, limit, sortBy, order } = req.validatedQuery;
    const profileUser = await getProfileUserByUsername(username);
    const { skip } = getPagination({ page, limit });
    const searchValue = search?.trim();
    const isFollowers = type === "followers";
    const objectUserId = new mongoose.Types.ObjectId(profileUser._id);
    const localField = isFollowers ? "following" : "follower";
    const sortField =
      sortBy === "username" ? "userDoc.username" : "userDoc.name";
    const sortOrder = order === "desc" ? -1 : 1;

    const pipeline = [
      {
        $match: {
          [localField]: objectUserId,
        },
      },
      {
        $lookup: {
          from: UserDB.collection.name,
          localField: isFollowers ? "follower" : "following",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: "$userDoc" },
    ];

    if (searchValue) {
      const regex = { $regex: escapeRegex(searchValue), $options: "i" };

      pipeline.push({
        $match: {
          $or: [{ "userDoc.username": regex }, { "userDoc.name": regex }],
        },
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        items: [
          { $sort: { [sortField]: sortOrder, _id: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: "$userDoc._id",
              name: "$userDoc.name",
              username: "$userDoc.username",
              avatar: "$userDoc.avatar",
              createdAt: "$createdAt",
              stats: "$userDoc.stats",
            },
          },
        ],
      },
    });

    const [result] = await FollowDB.aggregate(pipeline);
    const total = result?.metadata?.[0]?.total ?? 0;
    const items = result?.items ?? [];
    let subscriptionMap = new Map();

    if (items.length > 0) {
      const subscriptions = await SubscriptionModel.find({
        user: { $in: items.map((item) => item._id) },
      })
        .select("user plan currentPeriodEnd")
        .lean();

      subscriptionMap = new Map(
        subscriptions.map((subscription) => [
          String(subscription.user),
          subscription,
        ]),
      );
    }

    let followingSet = new Set();
    if (req.user?._id && items.length > 0) {
      const followingItems = await FollowDB.find({
        follower: req.user._id,
        following: { $in: items.map((item) => item._id) },
      })
        .select("following")
        .lean();

      followingSet = new Set(
        followingItems.map((item) => String(item.following)),
      );
    }

    const serializedItems = items.map((item) =>
      serializePublicUser(item, {
        subscription: subscriptionMap.get(String(item._id)),
        extra: {
          isFollowing: followingSet.has(String(item._id)),
        },
      }),
    );

    return resJson(
      res,
      200,
      `User ${type} fetched successfully.`,
      buildPaginationResult({
        items: serializedItems,
        total,
        page,
        limit,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getUserStrategies = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { page, limit, search, sortBy, order } = req.validatedQuery;
    const profileUser = await getProfileUserByUsername(username);
    const { skip } = getPagination({ page, limit });
    const isOwner = req.user?._id?.toString?.() === profileUser._id.toString();
    const viewerSubscription = req.user?._id
      ? await getEffectiveSubscription(req.user._id)
      : null;
    const viewerPlan = getViewerPlan(viewerSubscription);
    const andConditions = [{ user: profileUser._id }];

    if (!isOwner) {
      andConditions.push({ isPublic: true });
    }

    if (search) {
      andConditions.push({
        name: { $regex: escapeRegex(search), $options: "i" },
      });
    }

    const filter = { $and: andConditions };
    const sortOrder = order === "desc" ? -1 : 1;

    const strategyQuery =
      sortBy === "popular"
        ? StrategyDB.aggregate([
            { $match: filter },
            {
              $addFields: {
                popular: {
                  $add: ["$stats.viewCount", "$stats.bookmarkCount"],
                },
              },
            },
            { $sort: { popular: sortOrder, _id: -1 } },
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
            .populate("user", "name username avatar")
            .sort({ [sortBy]: sortOrder, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

    const [items, total] = await Promise.all([
      strategyQuery,
      StrategyDB.countDocuments(filter),
    ]);

    let bookmarkedStrategyIds = [];
    if (req.user?._id && items.length > 0) {
      const bookmarks = await BookmarkDB.find({
        user: req.user._id,
        targetType: "strategy",
        target: { $in: items.map((strategy) => strategy._id) },
      })
        .select("target")
        .lean();

      bookmarkedStrategyIds = bookmarks.map((bookmark) =>
        String(bookmark.target),
      );
    }

    const strategiesWithBookmarkState = items.map((strategy) => ({
      ...strategy,
      access: getStrategyAccessState(strategy, req.user?._id, viewerPlan),
      isBookmarked: bookmarkedStrategyIds.includes(String(strategy._id)),
    }));

    return resJson(
      res,
      200,
      "User strategies fetched successfully.",
      buildPaginationResult({
        items: strategiesWithBookmarkState,
        total,
        page,
        limit,
      }),
    );
  } catch (error) {
    next(error);
  }
};

const backtestSortFieldMap = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  roi: "computedRoi",
  winRate: "result.winRate",
  maxDrawdownPercent: "result.maxDrawdownPercent",
  profitFactor: "result.profitFactor",
};

export const getUserBacktests = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { page, limit, search, sortBy, order } = req.validatedQuery;
    const profileUser = await getProfileUserByUsername(username);
    const { skip } = getPagination({ page, limit });
    const isOwner = req.user?._id?.toString?.() === profileUser._id.toString();
    const sortOrder = order === "desc" ? -1 : 1;
    const sortField = backtestSortFieldMap[sortBy] ?? backtestSortFieldMap.roi;
    const sortStage = { [sortField]: sortOrder, _id: -1 };

    if (sortField !== "createdAt") {
      sortStage.createdAt = -1;
    }

    const pipeline = [
      {
        $lookup: {
          from: StrategyDB.collection.name,
          localField: "strategy",
          foreignField: "_id",
          as: "strategyDoc",
        },
      },
      { $unwind: "$strategyDoc" },
      {
        $lookup: {
          from: UserDB.collection.name,
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: "$userDoc" },
      {
        $match: {
          user: profileUser._id,
          ...(!isOwner ? { "strategyDoc.isPublic": true } : {}),
        },
      },
      {
        $addFields: {
          computedRoi: {
            $ifNull: [
              "$result.roi",
              {
                $cond: [
                  { $gt: ["$result.initialBalance", 0] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              "$result.finalBalance",
                              "$result.initialBalance",
                            ],
                          },
                          "$result.initialBalance",
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
    ];

    if (search) {
      const regex = { $regex: escapeRegex(search), $options: "i" };

      pipeline.push({
        $match: {
          $or: [
            { symbol: regex },
            { timeframe: regex },
            { exchange: regex },
            { "strategyDoc.name": regex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        items: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              exchange: 1,
              symbol: 1,
              timeframe: 1,
              startDate: 1,
              endDate: 1,
              entryFeeRate: 1,
              exitFeeRate: 1,
              hedgeMode: 1,
              createdAt: 1,
              updatedAt: 1,
              result: {
                duration: "$result.duration",
                initialBalance: "$result.initialBalance",
                finalBalance: "$result.finalBalance",
                totalPnL: "$result.totalPnL",
                roi: "$computedRoi",
                totalTrades: "$result.totalTrades",
                winRate: "$result.winRate",
                profitFactor: "$result.profitFactor",
                maxDrawdownPercent: "$result.maxDrawdownPercent",
                totalFees: "$result.totalFees",
              },
              strategy: {
                _id: "$strategyDoc._id",
                name: "$strategyDoc.name",
                isPublic: "$strategyDoc.isPublic",
              },
              user: {
                _id: "$userDoc._id",
                name: "$userDoc.name",
                username: "$userDoc.username",
                avatar: "$userDoc.avatar",
              },
            },
          },
        ],
      },
    });

    const [result] = await BacktestDB.aggregate(pipeline);
    const total = result?.metadata?.[0]?.total ?? 0;
    const backtests = result?.items ?? [];

    let bookmarkedBacktestIds = [];
    if (req.user?._id && backtests.length > 0) {
      const bookmarks = await BookmarkDB.find({
        user: req.user._id,
        targetType: "backtest",
        target: { $in: backtests.map((backtest) => backtest._id) },
      })
        .select("target")
        .lean();

      bookmarkedBacktestIds = bookmarks.map((bookmark) =>
        String(bookmark.target),
      );
    }

    const backtestsWithBookmarkState = backtests.map((backtest) => ({
      ...backtest,
      isBookmarked: bookmarkedBacktestIds.includes(String(backtest._id)),
    }));

    return resJson(
      res,
      200,
      "User backtests fetched successfully.",
      buildPaginationResult({
        items: backtestsWithBookmarkState,
        total,
        page,
        limit,
      }),
    );
  } catch (error) {
    next(error);
  }
};
