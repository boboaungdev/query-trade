import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { resCookie, resError, resJson } from "../../utils/response.js";
import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { Token } from "../../utils/token.js";
import { APP_NAME } from "../../constants/index.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { uploadAvatar } from "../../utils/uploadAvatar.js";
import { renderTemplate } from "../../utils/renderTemplate.js";

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const existUser = await UserDB.findOne({ email });
    if (!existUser) {
      throw resError(404, "User not found!");
    }

    // If user registered with Google (no password in DB)
    if (!existUser.password) {
      throw resError(
        400,
        "This email was created with Google Account. Please sign in with Google or reset your password by clicking 'forgot password?' to use email login.",
      );
    }

    const correctPassword = Encoder.compare(password, existUser.password);
    if (!correctPassword) {
      throw resError(401, "Incorrect password!");
    }

    const refreshToken = Token.makeRefreshToken({
      id: existUser._id.toString(),
    });
    const accessToken = Token.makeAccessToken({
      id: existUser._id.toString(),
    });

    const user = await UserDB.findByIdAndUpdate(
      existUser._id,
      {
        refreshToken,
      },
      {
        returnDocument: "after",
      },
    ).select("-password");

    resCookie(req, res, "refreshToken", refreshToken);
    return resJson(res, 200, "Signin success.", { user, accessToken });
  } catch (error) {
    next(error);
  }
};

export const signinGoogle = async (req, res, next) => {
  try {
    const { name, email, avatar: photourl, googleId } = req.body;
    let newUser = false;

    // 1. Try to find user by Google auth provider
    let user = await UserDB.findOne({
      authProviders: {
        $elemMatch: { provider: "google", providerId: googleId },
      },
    });

    // 2. Fallback to email lookup
    if (!user) {
      user = await UserDB.findOne({ email });

      // If found, but Google is not linked, link it
      if (user) {
        const alreadyLinked = user.authProviders?.some(
          (p) => p.provider === "google" && p.providerId === googleId,
        );

        if (!alreadyLinked) {
          user = await UserDB.findByIdAndUpdate(
            user._id,
            {
              $addToSet: {
                authProviders: {
                  provider: "google",
                  providerId: googleId,
                },
              },
            },
            { returnDocument: "after" },
          );
        }
      }
    }

    // 3. New user creation
    if (!user) {
      newUser = true;
      const baseUsername = email.split("@")[0].replace(/\./g, "");
      let username = baseUsername;
      let count = 1;

      while (await UserDB.exists({ username })) {
        username = `${baseUsername}${count++}`;
      }

      const appName = APP_NAME.toLowerCase().replace(/\s+/g, "-");

      const avatar = await uploadAvatar({
        username,
        photourl,
        folder: `${appName}/users/avatars`,
      });

      user = await UserDB.create({
        name,
        username,
        email,
        avatar,
        authProviders: [{ provider: "google", providerId: googleId }],
      });

      // await UserPrivacyDB.create({ user: user._id });
    }

    // 4. Create tokens
    const refreshToken = Token.makeRefreshToken({ id: user._id.toString() });
    const accessToken = Token.makeAccessToken({ id: user._id.toString() });

    // 5. Update user with refresh token
    user = await UserDB.findByIdAndUpdate(
      user._id,
      { refreshToken },
      { returnDocument: "after", select: "-password" },
    );

    const actionSection = `
  <p><b>Account:</b> ${user.email}</p>
  <p><b>Signin Method:</b> Google</p>
  <p><b>Signin Time:</b> ${new Date().toLocaleString()}</p>
`;

    // 6. Send signin email
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      title: "Google Sign-in Successful",
      name: user.name,
      message: newUser
        ? "Welcome! Your account was successfully created using Google."
        : "You have successfully signed in using your Google account.",
      actionSection,
      footerMessage:
        "If this login wasn't you, please secure your account immediately.",
    });

    await sendEmail({
      to: user.email,
      subject: `[${APP_NAME}] Google Sign-in Notification`,
      html: htmlFile,
    });

    // 7. Send response with tokens
    resCookie(req, res, "refreshToken", refreshToken);
    return resJson(
      res,
      newUser ? 201 : 200,
      "Signin Success with google account.",
      {
        user,
        accessToken,
      },
    );
  } catch (error) {
    next(error);
  }
};
