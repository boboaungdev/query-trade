import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { resError, resJson } from "../../utils/response.js";
import { renderTemplate } from "../../utils/renderTemplate.js";
import { APP_NAME, APP_URL } from "../../constants/index.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { VerifyDB } from "../../models/verify.js";

export const changePassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { oldPassword, newPassword } = req.body;

    const existsUser = await UserDB.findById(user._id).select("password");

    if (!existsUser.password) {
      throw resError(404, "You don't create password yet!");
    }

    if (!Encoder.compare(oldPassword, existsUser.password)) {
      throw resError(400, "Incorrect current password!");
    }

    // Password Encryption
    const newHashedPassword = Encoder.encode(newPassword);

    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      {
        password: newHashedPassword,
        passwordChangedAt: new Date(),
      },
      {
        returnDocument: "after",
      },
    ).select("-password");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    const actionSection = `
      <p><strong>Password Changed Successfully</strong></p>
      <p><b>Time:</b> ${new Date().toLocaleString()}</p>
    `;

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: APP_URL,
      year: new Date().getFullYear(),
      title: "Password Changed",
      message: "Your account password has been successfully updated.",
      actionSection,
      footerMessage:
        "If you did not perform this action, please reset your password immediately.",
    });

    await sendEmail({
      to: user.email,
      subject: `[${APP_NAME}] Password Changed Successfully`,
      html: htmlFile,
    });

    return resJson(res, 200, "Password changed successfully.", {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyChangePassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { email, newPassword, code } = req.body;

    if (!(await VerifyDB.exists({ email }))) {
      throw resError(400, "Invalid email!");
    }

    const record = await VerifyDB.findOne({ email, code });
    if (!record) {
      throw resError(400, "Invalid verification code!");
    }

    if (record.expiresIn < new Date()) {
      throw resError(410, "Expired verification code!");
    }

    await VerifyDB.findByIdAndDelete(record._id);

    // Password Encryption
    const newHashedPassword = Encoder.encode(newPassword);

    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      {
        password: newHashedPassword,
        passwordChangedAt: new Date(),
      },
      {
        returnDocument: "after",
      },
    ).select("-password");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    const actionSection = `
      <p><strong>Password Changed Successfully</strong></p>
      <p><b>Time:</b> ${new Date().toLocaleString()}</p>
    `;

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: APP_URL,
      year: new Date().getFullYear(),
      title: "Password Changed",
      message: "Your account password has been successfully updated.",
      actionSection,
      footerMessage:
        "If you did not perform this action, please reset your password immediately.",
    });

    await sendEmail({
      to: user.email,
      subject: `[${APP_NAME}] Password Changed Successfully`,
      html: htmlFile,
    });

    return resJson(res, 200, "Password changed successfully.", {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
