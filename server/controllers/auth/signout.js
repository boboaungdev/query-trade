import { UserDB } from "../../models/user.js";
import { clearCookie, resJson } from "../../utils/response.js";

export const signout = async (req, res, next) => {
  try {
    const userId = req.userId;

    await UserDB.findByIdAndUpdate(
      userId,
      { $unset: { refreshToken: "" } },
      { $unset: { pushToken: "" } },
      { returnDocument: "after" },
    );

    clearCookie(req, res, "refreshToken");
    return resJson(res, 200, "Signout success.");
  } catch (error) {
    next(error);
  }
};
