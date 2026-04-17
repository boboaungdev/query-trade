import { UserDB } from "../../models/user.js";
import { resJson } from "../../utils/response.js";

export const existUser = async (req, res, next) => {
  try {
    const { email, username } = req.body;
    const query = email
      ? { email }
      : username
        ? { username: username.trim() }
        : {};

    const user = await UserDB.exists(query);

    return resJson(res, 200, "User existence checked.", { exist: !!user });
  } catch (error) {
    next(error);
  }
};
