import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { resError, resJson } from "../../utils/response.js";
import { VerifyDB } from "../../models/verify.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { APP_NAME } from "../../constants/index.js";

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
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // e.g. "482391"
    const expiresIn = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Create new verification
    await VerifyDB.create({
      email,
      code,
      expiresIn,
    });

    // Load the HTML file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/forgotPasswordVerify.html"),
      "utf8",
    );

    htmlFile = htmlFile.replace("{verificationCode}", code);
    // htmlFile = htmlFile.replace(
    //   "{logoImage}",
    //   `${process.env.SERVER_URL}/image/logo`
    // );

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
