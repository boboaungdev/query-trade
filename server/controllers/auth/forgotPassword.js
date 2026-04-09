import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { VerifyDB } from "../../models/verify.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { resError, resJson } from "../../utils/response.js";
import { APP_NAME, APP_URL } from "../../constants/index.js";
import { renderTemplate } from "../../utils/renderTemplate.js";
import { generateEmailCode } from "../../utils/generateEmailCode.js";

export const forgotPassword = async (req, res, next) => {
  try {
    const email = req.body.email;

    // Check if user already exist or not
    if (!(await UserDB.exists({ email }))) {
      throw resError(404, "No user found with this email!");
    }

    // Delete old verification
    if (await VerifyDB.exists({ email })) {
      await VerifyDB.deleteOne({ email });
    }

    // Generate new token
    const code = generateEmailCode();

    // Create new verification
    await VerifyDB.create({
      email,
      code,
    });

    const actionSection = `
  <div class="code">${code}</div>
  <p>This code will expire in 10 minutes.</p>
`;

    // Load the HTML file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: APP_URL,
      year: new Date().getFullYear(),
      title: "Forgot Password Verification",
      message: "Use the verification code below to reset your password.",
      actionSection,
      footerMessage:
        "If you did not request a password reset, you can safely ignore this email.",
    });

    // Send Email
    await sendEmail({
      to: email,
      subject: `[${APP_NAME}] Forgot Password Verification`,
      html: htmlFile,
    });

    return resJson(
      res,
      201,
      "Verification code email sent, don't forget to check also in spam folder.",
    );
  } catch (error) {
    next(error);
  }
};
