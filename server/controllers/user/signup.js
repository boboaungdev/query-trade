import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { VerifyDB } from "../../models/verify.js";
import { APP_NAME } from "../../constants/index.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { resError, resJson } from "../../utils/response.js";

export const signup = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;
    // Check if user already exist or not
    if (await UserDB.findOne({ email })) {
      throw resError(409, "Email already exists!");
    }
    if (await UserDB.findOne({ username })) {
      throw resError(409, "Username already exists!");
    }

    // Delete old verification
    if (await VerifyDB.findOne({ email })) {
      await VerifyDB.deleteOne({ email });
    }

    // Generate new token
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // e.g. "482391"
    const hashedPassword = Encoder.encode(password);
    const expireMinutes = 10; // 10 mins
    const expireAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    // Create new verification
    await VerifyDB.create({
      name,
      username,
      email,
      password: hashedPassword,
      code,
      expireAt,
    });

    // Load the HTML file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/signupVerify.html"),
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
      subject: `[${APP_NAME}] Verify Your Email`,
      html: htmlFile,
    });

    return resJson(
      res,
      201,
      `Verification code sent to ${email}, please verify within ${expireMinutes} minutes. Don't forget to check your spam folder!`,
    );
  } catch (error) {
    next(error);
  }
};
