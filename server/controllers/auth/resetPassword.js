import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Token } from "../../utils/token.js";
import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { APP_NAME, SITE_URL } from "../../constants/index.js";
import { renderTemplate } from "../../utils/renderTemplate.js";
import { resCookie, resError, resJson } from "../../utils/response.js";

export const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const user = await UserDB.findOne({ email });
    if (!user) {
      throw resError(404, "User not found!");
    }

    // Password Encryption
    const newHashedPassword = Encoder.encode(newPassword);

    const refreshToken = Token.makeRefreshToken({
      id: user._id.toString(),
    });
    const accessToken = Token.makeAccessToken({
      id: user._id.toString(),
    });

    // Update password and refreshToken, return updated user (excluding password)
    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      {
        password: newHashedPassword,
        passwordChangedAt: new Date(),
        refreshToken,
      },
      { returnDocument: "after" },
    );

    const actionSection = `
  <p><strong>Password Reset Successful</strong></p>
  <p>Your password was successfully updated.</p>
  <p><b>Time:</b> ${new Date().toLocaleString()}</p>
`;

    // Send verified email
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
      title: "Password Reset Successful",
      message: "Your password has been successfully reset.",
      actionSection,
      footerMessage:
        "If you did not perform this action, please secure your account immediately.",
    });

    await sendEmail({
      to: updatedUser.email,
      subject: `[${APP_NAME}] Reset Password Success`,
      html: htmlFile,
    });

    resCookie(req, res, "refreshToken", refreshToken);
    return resJson(res, 200, "Reset password success.", {
      user: updatedUser,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};
