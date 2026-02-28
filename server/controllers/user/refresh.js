import { UserDB } from "../../models/user.js";
import { Token } from "../../utils/token.js";
import { resCookie, resError, resJson } from "../../utils/response.js";

export const refresh = async (req, res, next) => {
  try {
    const userId = req.decodedId;
    const user = await UserDB.exists({ _id: userId });
    if (!user) {
      throw resError(401, "Authenticated user not found!");
    }

    const accessToken = Token.makeAccessToken({
      id: userId,
    });
    const refreshToken = Token.makeRefreshToken({
      id: userId,
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
