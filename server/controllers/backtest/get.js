import { UserDB } from "../../models/user.js";
import { BacktestDB } from "../../models/backtest.js";
import { StrategyDB } from "../../models/strategy.js";
import { BookmarkDB } from "../../models/bookmark.js";
import { resError, resJson } from "../../utils/response.js";

export const getBacktestById = async (req, res, next) => {
  try {
    const user = req.user;
    const { backtestId } = req.params;

    const backtest = await BacktestDB.findById(backtestId)
      .populate({
        path: "strategy",
        select: "name isPublic stats user",
        populate: {
          path: "user",
          select: "username",
        },
      })
      .populate("user", "username")
      .lean();

    if (!backtest) {
      throw resError(404, "Backtest not found!");
    }

    if (user?._id) {
      const bookmark = await BookmarkDB.findOne({
        user: user._id,
        targetType: "backtest",
        target: backtest._id,
      })
        .select("_id")
        .lean();

      backtest.isBookmarked = Boolean(bookmark);
    }

    return resJson(res, 200, "Backtest fetched successfully.", {
      backtest,
    });
  } catch (error) {
    next(error);
  }
};

const backtestSortFieldMap = {
  createdAt: "createdAt",
  roi: "computedRoi",
  winRate: "result.winRate",
  maxDrawdownPercent: "result.maxDrawdownPercent",
  profitFactor: "result.profitFactor",
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const backtestDurationRangeMap = {
  "7d": { $lte: 7 * DAY_IN_MS },
  "1m": { $gt: 7 * DAY_IN_MS, $lte: 30 * DAY_IN_MS },
  "3m": { $gt: 30 * DAY_IN_MS, $lte: 90 * DAY_IN_MS },
  "6m": { $gt: 90 * DAY_IN_MS, $lte: 180 * DAY_IN_MS },
  "1y": { $gt: 180 * DAY_IN_MS, $lte: 365 * DAY_IN_MS },
};

export const getBacktests = async (req, res, next) => {
  try {
    const user = req.user;
    const { page, limit, search, source, duration, sortBy, order } =
      req.validatedQuery;
    const skip = (page - 1) * limit;
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
          ...(source === "me"
            ? { user: user._id }
            : {
                $or: [
                  { "strategyDoc.isPublic": true },
                  { "strategyDoc.user": user._id },
                  { user: user._id },
                ],
              }),
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

    const durationRange = backtestDurationRangeMap[duration];

    if (durationRange) {
      pipeline.push({
        $match: {
          "result.duration": durationRange,
        },
      });
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };

      pipeline.push({
        $match: {
          $or: [
            { symbol: regex },
            { timeframe: regex },
            { exchange: regex },
            { "strategyDoc.name": regex },
            { "userDoc.username": regex },
            { "userDoc.name": regex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        backtests: [
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

    const [leaderboardResult] = await BacktestDB.aggregate(pipeline);
    const total = leaderboardResult?.metadata?.[0]?.total ?? 0;
    const totalPage = Math.ceil(total / limit);
    const backtests = leaderboardResult?.backtests ?? [];

    let bookmarkedBacktestIds = [];
    if (user?._id && backtests.length > 0) {
      const bookmarks = await BookmarkDB.find({
        user: user._id,
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

    return resJson(res, 200, "Backtest leaderboard fetched successfully.", {
      total,
      totalPage,
      currentPage: page,
      limitPerPage: limit,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
      backtests: backtestsWithBookmarkState,
    });
  } catch (error) {
    next(error);
  }
};
