import { UserDB } from "../../models/user.js";
import { resJson } from "../../utils/response.js";

export const existUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Your logic to check if user exists
    const user = await UserDB.exists({ email });

    return resJson(res, 200, "User existence checked.", { exist: !!user });
  } catch (error) {
    next(error);
  }
};
