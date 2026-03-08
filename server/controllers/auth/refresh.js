import { UserDB } from "../../models/user.js";
import { Token } from "../../utils/token.js";
import { resCookie, resJson } from "../../utils/response.js";

export const refresh = async (req, res, next) => {
  try {
    const user = req.user;

    const accessToken = Token.makeAccessToken({
      id: user._id,
    });
    const refreshToken = Token.makeRefreshToken({
      id: user._id,
    });

    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      { refreshToken },
      { returnDocument: "after", select: "-password" },
    );

    resCookie(req, res, "refreshToken", refreshToken);
    return resJson(res, 200, "Success refresh.", {
      user: updatedUser,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};
