import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { APP_NAME } from "../../constants/index.js";
import { uploadAvatar } from "../../utils/uploadAvatar.js";
import { resError, resJson } from "../../utils/response.js";

export const update = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { name, username, avatar, bio, email, password } = req.body;

    const payload = {};

    if (name && name != currentUser.name) {
      payload.name = name;
    }

    if (username && username != currentUser.username) {
      if (
        await UserDB.exists({
          username,
          _id: { $ne: currentUser._id },
        })
      ) {
        throw resError(409, "Username already exist!");
      }

      payload.username = username;
    }

    const appName = APP_NAME.toLowerCase().replace(/\s+/g, "-");

    if (avatar && avatar != currentUser.avatar) {
      payload.avatar = await uploadAvatar({
        user: currentUser,
        photourl: avatar,
        folder: `${appName}/users/avatars`,
      });
    }

    if ("bio" in req.body && (bio || "") !== (currentUser.bio || "")) {
      payload.bio = bio || "";
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
      .lean()
      .lean();

    return resJson(res, 200, "Updated user details", { user });
  } catch (error) {
    next(error);
  }
};
