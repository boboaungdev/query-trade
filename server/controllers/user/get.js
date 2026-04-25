import { FollowDB } from "../../models/follow.js";
import { getEffectiveSubscription } from "../subscription/helpers.js";
import { UserDB } from "../../models/user.js";
import { serializePublicUser } from "../../services/user/serializePublicUser.js";
import { resError, resJson } from "../../utils/response.js";

export const getUserByUsername = async (req, res, next) => {
  try {
    const username = String(req.params.username || "").toLowerCase();

    const user = await UserDB.findOne({ username })
      .select("name username avatar bio createdAt stats")
      .lean();

    if (!user) {
      throw resError(404, "User not found!");
    }

    let isFollowing = false;
    const [subscription, follow] = await Promise.all([
      getEffectiveSubscription(user._id),
      req.user?._id && req.user?._id.toString() !== String(user._id)
        ? FollowDB.findOne({
            follower: req.user._id,
            following: user._id,
          })
            .select("_id")
            .lean()
        : Promise.resolve(null),
    ]);

    if (follow) {
      isFollowing = true;
    }

    return resJson(res, 200, "User fetched successfully.", {
      user: serializePublicUser(user, {
        subscription,
        extra: { isFollowing },
      }),
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const userId = String(req.params.userId || "");

    const user = await UserDB.findById(userId)
      .select("name username avatar bio createdAt stats")
      .lean();

    if (!user) {
      throw resError(404, "User not found!");
    }

    let isFollowing = false;
    const [subscription, follow] = await Promise.all([
      getEffectiveSubscription(user._id),
      req.user?._id && req.user?._id.toString() !== String(user._id)
        ? FollowDB.findOne({
            follower: req.user._id,
            following: user._id,
          })
            .select("_id")
            .lean()
        : Promise.resolve(null),
    ]);

    if (follow) {
      isFollowing = true;
    }

    return resJson(res, 200, "User fetched successfully.", {
      user: serializePublicUser(user, {
        subscription,
        extra: { isFollowing },
      }),
    });
  } catch (error) {
    next(error);
  }
};
