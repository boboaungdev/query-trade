import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { resError, resJson } from "../../utils/response.js";
import { uploadAvatar } from "../../utils/uploadAvatar.js";

export const update = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { name, username, avatar, email, password } = req.body;

    const payload = {};

    if (name && name != currentUser.name) {
      payload.name = name;
    }

    if (username && username != currentUser.username) {
      const exist = await UserDB.exists({
        username,
        _id: { $ne: currentUser._id },
      });

      if (exist) {
        throw resError(409, "Username already exist!");
      }

      payload.username = username;
    }

    if (avatar && avatar != currentUser.avatar) {
      payload.avatar = await uploadAvatar({
        user: currentUser,
        photourl: avatar,
        folder: "query-trade/users/avatars",
      });
    }

    if (email && email != currentUser.email) {
      payload.email = email;
    }

    if (password) {
      const hashedPassword = Encoder.encode(password);
      payload.password = hashedPassword;
    }

    const user = await UserDB.findByIdAndUpdate(currentUser._id, payload, {
      returnDocument: "after",
    })
      .select("-password")
      .lean();

    return resJson(res, 200, "Updated user details", { user });
  } catch (error) {
    next(error);
  }
};
