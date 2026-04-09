import { UserDB } from "../../models/user.js";
import { resError, resJson } from "../../utils/response.js";

export const getUserByUsername = async (req, res, next) => {
  try {
    const username = String(req.params.username || "").toLowerCase();

    const user = await UserDB.findOne({ username })
      .select("name username avatar createdAt stats")
      .lean();

    if (!user) {
      throw resError(404, "User not found!");
    }

    return resJson(res, 200, "User fetched successfully.", {
      user,
    });
  } catch (error) {
    next(error);
  }
};
