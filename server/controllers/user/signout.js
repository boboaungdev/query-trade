import { UserDB } from "../../models/user.js";
import { clearCookie, resJson } from "../../utils/response.js";

export const signout = async (req, res, next) => {
  try {
    const user = req.user;
    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      { $unset: { refreshToken: "" } },
      { $unset: { pushToken: "" } },
      { returnDocument: "after" },
    );

    clearCookie(req, res, "refreshToken");

    if (!updatedUser) return res.status(204).end();

    return resJson(res, 200, "Successfully logged out.");
  } catch (error) {
    next(error);
  }
};
