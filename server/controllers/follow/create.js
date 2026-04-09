import { FollowDB } from "../../models/follow.js";
import { UserDB } from "../../models/user.js";
import { resError, resJson } from "../../utils/response.js";

export const createFollow = async (req, res, next) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    if (user._id.toString() === userId) {
      throw resError(400, "You cannot follow yourself!");
    }

    if (!(await UserDB.exists({ _id: userId }))) {
      throw resError(404, "User not found!");
    }

    const existingFollow = await FollowDB.findOne({
      follower: user._id,
      following: userId,
    }).select("_id");

    if (existingFollow) {
      return resJson(res, 200, "User already followed.", {
        isFollowing: true,
      });
    }

    await FollowDB.create({
      follower: user._id,
      following: userId,
    });

    await Promise.all([
      UserDB.updateOne(
        { _id: user._id },
        { $inc: { "stats.followingCount": 1 } },
      ),
      UserDB.updateOne({ _id: userId }, { $inc: { "stats.followerCount": 1 } }),
    ]);

    return resJson(res, 201, "User followed successfully.", {
      isFollowing: true,
    });
  } catch (error) {
    next(error);
  }
};
