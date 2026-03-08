import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { VerifyDB } from "../../models/verify.js";
import { APP_NAME } from "../../constants/index.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { Token } from "../../utils/token.js";
import { resCookie, resError, resJson } from "../../utils/response.js";

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
    const expiresIn = new Date(Date.now() + expireMinutes * 60 * 1000);

    // Create new verification
    await VerifyDB.create({
      name,
      username,
      email,
      password: hashedPassword,
      code,
      expiresIn,
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

    if (record.expiresIn < new Date()) {
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
