import mongoose from "mongoose";

import { FollowDB } from "../../models/follow.js";
import { UserDB } from "../../models/user.js";
import { resError, resJson } from "../../utils/response.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function ensureUserExists(userId) {
  const user = await UserDB.findById(userId).select("_id");
  if (!user) {
    throw resError(404, "User not found!");
  }
}

async function getFollowList({
  userId,
  page,
  limit,
  search,
  localField,
  resultKey,
}) {
  await ensureUserExists(userId);

  const skip = (page - 1) * limit;
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const searchValue = search?.trim();
  const pipeline = [
    {
      $match: {
        [localField]: objectUserId,
      },
    },
    {
      $lookup: {
        from: UserDB.collection.name,
        localField: localField === "following" ? "follower" : "following",
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
        { $sort: { createdAt: -1, _id: -1 } },
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
  const totalPage = Math.ceil(total / limit);

  return {
    total,
    totalPage,
    currentPage: page,
    limitPerPage: limit,
    hasNextPage: page < totalPage,
    hasPrevPage: page > 1,
    [resultKey]: result?.items ?? [],
  };
}

export const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit, search } = req.validatedQuery;

    const result = await getFollowList({
      userId,
      page,
      limit,
      search,
      localField: "following",
      resultKey: "followers",
    });

    return resJson(res, 200, "Followers fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit, search } = req.validatedQuery;

    const result = await getFollowList({
      userId,
      page,
      limit,
      search,
      localField: "follower",
      resultKey: "following",
    });

    return resJson(res, 200, "Following fetched successfully.", result);
  } catch (error) {
    next(error);
  }
};

export const getFollowStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    await ensureUserExists(userId);

    const isFollowing = Boolean(
      await FollowDB.exists({
        follower: user._id,
        following: userId,
      }),
    );

    return resJson(res, 200, "Follow status fetched successfully.", {
      isFollowing,
      isSelf: user._id.toString() === userId,
    });
  } catch (error) {
    next(error);
  }
};
