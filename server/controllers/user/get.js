import { FollowDB } from "../../models/follow.js";
import { UserDB } from "../../models/user.js";
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
    if (req.user?._id && req.user?._id.toString() !== String(user._id)) {
      const follow = await FollowDB.findOne({
        follower: req.user._id,
        following: user._id,
      })
        .select("_id")
        .lean();

      isFollowing = Boolean(follow);
    }

    return resJson(res, 200, "User fetched successfully.", {
      user: {
        ...user,
        isFollowing,
      },
    });
  } catch (error) {
    next(error);
  }
};
