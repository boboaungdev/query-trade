import { Token } from "../../utils/token.js";
import { resJson } from "../../utils/response.js";

export const refresh = async (req, res, next) => {
  try {
    const userId = req.userId;

    const accessToken = Token.makeAccessToken({
      id: userId,
    });

    return resJson(res, 200, "Token refresh success.", {
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};
