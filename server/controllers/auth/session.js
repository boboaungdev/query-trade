import { UserDB } from "../../models/user.js";
import { resJson } from "../../utils/response.js";

export const getSession = async (req, res, next) => {
  try {
    const user = await UserDB.findById(req.userId)
      .select("_id name username email avatar role")
      .lean();

    if (!user) {
      return resJson(res, 200, "No active session.", {
        authenticated: false,
        user: null,
      });
    }

    return resJson(res, 200, "Active session.", {
      authenticated: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
