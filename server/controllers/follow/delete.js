import { FollowDB } from "../../models/follow.js";
import { UserDB } from "../../models/user.js";
import { resJson } from "../../utils/response.js";

export const deleteFollow = async (req, res, next) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    const deletedFollow = await FollowDB.findOneAndDelete({
      follower: user._id,
      following: userId,
    }).select("_id");

    if (deletedFollow) {
      await Promise.all([
        UserDB.updateOne(
          { _id: user._id, "stats.followingCount": { $gt: 0 } },
          { $inc: { "stats.followingCount": -1 } },
        ),
        UserDB.updateOne(
          { _id: userId, "stats.followerCount": { $gt: 0 } },
          { $inc: { "stats.followerCount": -1 } },
        ),
      ]);
    }

    return resJson(res, 200, "User unfollowed successfully.", {
      isFollowing: false,
    });
  } catch (error) {
    next(error);
  }
};
