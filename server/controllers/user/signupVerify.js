import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { VerifyDB } from "../../models/verify.js";
import { UserDB } from "../../models/user.js";
import { Token } from "../../utils/token.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { APP_NAME } from "../../constants/index.js";
import { resCookie, resError, resJson } from "../../utils/response.js";

export const signupVerify = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!(await VerifyDB.findOne({ email }))) {
      throw resError(400, "Invalid email!");
    }

    const record = await VerifyDB.findOne({ code });
    if (!record) {
      throw resError(400, "Invalid verification code!");
    }

    if (record.expireAt < new Date()) {
      throw resError(410, "Expired verification code!");
    }

    const newUser = await UserDB.create({
      name: record.name,
      username: record.username,
      email: record.email,
      password: record.password,
    });

    // if (newUser) {
    //   await UserPrivacyDB.create({ user: newUser._id });
    // }

    const refreshToken = Token.makeRefreshToken({
      id: newUser._id.toString(),
    });
    const accessToken = Token.makeAccessToken({
      id: newUser._id.toString(),
    });

    // Update and get user in one step
    const user = await UserDB.findByIdAndUpdate(
      newUser._id,
      {
        refreshToken,
        $addToSet: {
          authProviders: {
            provider: "server",
            providerId: newUser._id,
          },
        },
      },
      { returnDocument: "after", select: "-password" },
    );

    await VerifyDB.findByIdAndDelete(record._id);
    // Send verified email
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/signupSuccess.html"),
      "utf8",
    );

    await sendEmail({
      to: user.email,
      subject: `[${APP_NAME}] Signup Success`,
      html: htmlFile,
    });

    resCookie(req, res, "refreshToken", refreshToken);
    return resJson(res, 201, "Signup successful.", { user, accessToken });
  } catch (error) {
    next(error);
  }
};
