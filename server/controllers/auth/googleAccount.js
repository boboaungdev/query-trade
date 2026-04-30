import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { resError, resJson } from "../../utils/response.js";
import { APP_NAME, SITE_URL } from "../../constants/index.js";
import { renderTemplate } from "../../utils/renderTemplate.js";

export const connectGoogle = async (req, res, next) => {
  try {
    const user = req.user;
    const { googleId } = req.body;

    // Check if user already linked Google
    const alreadyLinked = user.authProviders?.some(
      (p) => p.provider === "google",
    );

    if (alreadyLinked) {
      throw resError(400, "Google account already connected.");
    }

    // Check if Google already linked to another account
    const exists = await UserDB.exists({
      authProviders: {
        $elemMatch: { provider: "google", providerId: googleId },
      },
    });

    if (exists) {
      throw resError(
        409,
        "This Google account is already linked to another account.",
      );
    }

    // Link Google to current user
    const updatedUser = await UserDB.findByIdAndUpdate(
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
    ).lean();

    // Email notification
    const actionSection = `
      <p><b>Google Account Connected</b></p>
      <p><b>Time:</b> ${new Date().toLocaleString()}</p>
    `;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: SITE_URL,
      year: new Date().getFullYear(),
      title: "Google Account Connected",
      message:
        "Your Google account has been successfully linked to your profile.",
      actionSection,
      footerMessage:
        "If you did not perform this action, please secure your account immediately.",
    });

    await sendEmail({
      to: updatedUser.email,
      subject: `[${APP_NAME}] Google Account Connected`,
      html: htmlFile,
    });

    return resJson(res, 200, "Google account connected successfully.", {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const disconnectGoogle = async (req, res, next) => {
  try {
    const user = req.user;

    // Check if Google is connected
    const googleProvider = user.authProviders?.find(
      (p) => p.provider === "google",
    );

    if (!googleProvider) {
      throw resError(400, "Google account is not connected.");
    }

    // Prevent removing the only login method
    if (user.authProviders.length === 1) {
      throw resError(
        400,
        "You cannot disconnect Google because it is your only login method.",
      );
    }

    // Remove Google provider
    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      {
        $pull: {
          authProviders: { provider: "google" },
        },
      },
      { returnDocument: "after" },
    ).lean();

    // Email notification
    const actionSection = `
      <p><b>Google Account Disconnected</b></p>
      <p><b>Time:</b> ${new Date().toLocaleString()}</p>
    `;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: SITE_URL,
      year: new Date().getFullYear(),
      title: "Google Account Disconnected",
      message: "Your Google account has been disconnected from your profile.",
      actionSection,
      footerMessage:
        "If you did not perform this action, please secure your account immediately.",
    });

    await sendEmail({
      to: updatedUser.email,
      subject: `[${APP_NAME}] Google Account Disconnected`,
      html: htmlFile,
    });

    return resJson(res, 200, "Google account disconnected successfully.", {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
