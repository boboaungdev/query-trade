import { resJson } from "../../utils/response.js";

export const profile = async (req, res, next) => {
  try {
    const user = req.user;

    return resJson(res, 200, "Success get user details.", { user });
  } catch (error) {
    next(error);
  }
};
