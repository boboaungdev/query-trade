import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { VerificationModel } from "../../models/verify.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { resError, resJson } from "../../utils/response.js";
import { renderTemplate } from "../../utils/renderTemplate.js";
import { generateEmailCode } from "../../utils/generateEmailCode.js";
import { APP_NAME, APP_URL, EXPIRE_MINUTE } from "../../constants/index.js";

export const checkChangeEmail = async (req, res, next) => {
  try {
    const user = req.user;
    const { newEmail: email, password } = req.body;

    if (user.email === email) {
      throw resError(400, "Choose other email!");
    }

    if (await UserDB.exists({ email })) {
      throw resError(409, "Email already in use!");
    }

    const existsUser = await UserDB.findById(user._id).select("password");

    if (!Encoder.compare(password, existsUser.password)) {
      throw resError(400, "Incorrect password!");
    }

    // Delete old verification
    if (await VerificationModel.exists({ email })) {
      await VerificationModel.deleteOne({ email });
    }

    const code = generateEmailCode();

    await VerificationModel.create({
      email,
      code,
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    // 🔹 HTML section that contains the code
    const actionSection = `
  <div class="code">${code}</div>
  <p>This code will expire in ${EXPIRE_MINUTE} minutes.</p>
`;

    // 🔹 Replace template placeholders
    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: APP_URL,
      year: new Date().getFullYear(),
      title: "Change Email Verification",
      message: "Use the verification code below to confirm your email change.",
      actionSection,
      footerMessage:
        "If you did not request this change, you can safely ignore this email.",
    });

    // Send email
    await sendEmail({
      to: email,
      subject: `[${APP_NAME}] Change Email Verification`,
      html: htmlFile,
    });

    return resJson(res, 200, "Verification code sent.");
  } catch (error) {
    next(error);
  }
};

export const verifyChangeEmail = async (req, res, next) => {
  try {
    const user = req.user;
    const { newEmail: email, code } = req.body;

    if (await UserDB.exists({ email })) {
      throw resError(409, "Email already in use!");
    }

    if (!(await VerificationModel.exists({ email }))) {
      throw resError(400, "Invalid email!");
    }

    const record = await VerificationModel.findOne({ email, code });
    if (!record) {
      throw resError(400, "Invalid verification code!");
    }

    if (record.expiresIn < new Date()) {
      throw resError(410, "Expired verification code!");
    }

    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      {
        email,
      },
      { returnDocument: "after" },
    ).lean();

    await VerificationModel.findByIdAndDelete(record._id);

    const actionSection = `
      <p><strong>Email Changed Successfully</strong></p>
      <p><b>New Email:</b> ${updatedUser.email}</p>
      <p><b>Time:</b> ${new Date().toLocaleString()}</p>
    `;

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: APP_URL,
      year: new Date().getFullYear(),
      title: "Email Changed Successfully",
      message: "Your account email has been successfully updated.",
      actionSection,
      footerMessage:
        "If you did not perform this action, please secure your account immediately.",
    });

    await sendEmail({
      to: updatedUser.email,
      subject: `[${APP_NAME}] Email Change Successful`,
      html: htmlFile,
    });

    return resJson(res, 200, "Change email success.", { user: updatedUser });
  } catch (error) {
    next(error);
  }
};
