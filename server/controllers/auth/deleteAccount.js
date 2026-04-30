import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { VerificationModel } from "../../models/verify.js";
import { BacktestDB } from "../../models/backtest.js";
import { StrategyDB } from "../../models/strategy.js";
import { BookmarkDB } from "../../models/bookmark.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { renderTemplate } from "../../utils/renderTemplate.js";
import { generateEmailCode } from "../../utils/generateEmailCode.js";
import { clearCookie, resError, resJson } from "../../utils/response.js";
import { APP_NAME, SITE_URL, EXPIRE_MINUTE } from "../../constants/index.js";

export const deleteAccountVerify = async (req, res, next) => {
  try {
    const user = req.user;
    const email = user.email;

    if (await VerificationModel.exists({ email })) {
      await VerificationModel.deleteOne({ email });
    }

    const code = generateEmailCode();

    await VerificationModel.create({
      email,
      code,
    });

    const actionSection = `
  <div class="code">${code}</div>
  <p>This verification code will expire in ${EXPIRE_MINUTE} minutes.</p>
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
      title: "Delete Account Verification",
      message:
        "Use the verification code below to confirm your account deletion.",
      actionSection,
      footerMessage:
        "If you did not request account deletion, you can safely ignore this email.",
    });

    await sendEmail({
      to: email,
      subject: `[${APP_NAME}] Delete Account Verification`,
      html: htmlFile,
    });

    return resJson(
      res,
      201,
      "Delete account verification code sent. Please check your inbox and spam folder.",
    );
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const user = req.user;
    const { password, code } = req.body;

    const existsUser = await UserDB.findById(user._id).select("password");

    if (password) {
      if (!existsUser.password) {
        throw resError(
          400,
          "Password is not set for this account. Use verification code instead!",
        );
      }

      if (!Encoder.compare(password, existsUser.password)) {
        throw resError(400, "Incorrect password!");
      }
    } else {
      const record = await VerificationModel.findOne({
        email: user.email,
        code,
      });
      if (!record) {
        throw resError(400, "Invalid verification code!");
      }

      if (record.expiresIn < new Date()) {
        throw resError(410, "Expired verification code!");
      }

      await VerificationModel.findByIdAndDelete(record._id);
    }

    const userStrategies = await StrategyDB.find({ user: user._id })
      .select("_id")
      .lean();
    const userStrategyIds = userStrategies.map((item) => item._id);
    const userBacktests = await BacktestDB.find({ user: user._id })
      .select("_id")
      .lean();
    const userBacktestIds = userBacktests.map((item) => item._id);

    // Delete everything created by this user.
    await Promise.all([
      BookmarkDB.deleteMany({ user: user._id }),
      BacktestDB.deleteMany({ user: user._id }),
      StrategyDB.deleteMany({ user: user._id }),
    ]);

    // Delete everything referencing this user's strategies.
    if (userStrategyIds.length) {
      await BookmarkDB.deleteMany({
        targetType: "strategy",
        target: { $in: userStrategyIds },
      });
    }

    if (userBacktestIds.length) {
      await BookmarkDB.deleteMany({
        targetType: "backtest",
        target: { $in: userBacktestIds },
      });
    }

    const deletedUser = await UserDB.findByIdAndDelete(user._id);
    clearCookie(req, res, "refreshToken");

    if (!deletedUser) {
      throw resError(404, "User not found!");
    }

    // Best-effort email notification after successful deletion.
    const actionSection = `
  <p><strong>Account Deleted Successfully</strong></p>
  <p>Your account and related data have been permanently removed from ${APP_NAME}.</p>
  <p><b>Email:</b> ${deletedUser.email}</p>
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
      title: "Account Deleted Successfully",
      message: "Your account has been deleted successfully.",
      actionSection,
      footerMessage:
        "Thank you for your support. We hope to see you again soon!",
    });

    await sendEmail({
      to: deletedUser.email,
      subject: `[${APP_NAME}] Account Deleted Successfully`,
      html: htmlFile,
    });

    return resJson(res, 200, "Account deleted successfully.");
  } catch (error) {
    next(error);
  }
};
