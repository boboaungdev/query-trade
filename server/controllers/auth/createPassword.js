import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { UserDB } from "../../models/user.js";
import { Encoder } from "../../utils/encoder.js";
import { resJson } from "../../utils/response.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { APP_NAME, APP_URL } from "../../constants/index.js";
import { renderTemplate } from "../../utils/renderTemplate.js";

export const createPassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { password } = req.body;

    // Password Encryption
    const newHashedPassword = Encoder.encode(password);

    const updatedUser = await UserDB.findByIdAndUpdate(
      user._id,
      {
        password: newHashedPassword,
        passwordChangedAt: new Date(),
        $addToSet: {
          authProviders: {
            provider: "server",
            providerId: user._id,
          },
        },
      },
      {
        returnDocument: "after",
      },
    ).lean();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let htmlFile = fs.readFileSync(
      path.join(__dirname, "../../assets/html/email.html"),
      "utf8",
    );

    const actionSection = `
      <p><strong>Password Created Successfully</strong></p>
      <p><b>Time:</b> ${new Date().toLocaleString()}</p>
    `;

    htmlFile = renderTemplate(htmlFile, {
      appName: APP_NAME,
      appUrl: APP_URL,
      year: new Date().getFullYear(),
      title: "Password Created",
      message: "Your account password has been successfully created.",
      actionSection,
      footerMessage:
        "If you did not perform this action, please reset your password immediately.",
    });

    await sendEmail({
      to: user.email,
      subject: `[${APP_NAME}] Password Created Successfully`,
      html: htmlFile,
    });

    return resJson(res, 200, "Password created successfully.", {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
