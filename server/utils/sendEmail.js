import nodemailer from "nodemailer";

import { APP_NAME, EMAIL_PASSWORD, EMAIL_USER } from "../constants/index.js";
import { ErrorDB } from "../models/error.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const result = await transporter.sendMail({
      from: `${APP_NAME} <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    // If success → remove existing send_email error
    await ErrorDB.deleteOne({ source: "send_email" });

    return { status: true, message: "Success send email", result };
  } catch (error) {
    // Check if error already exists
    if (!(await ErrorDB.exists({ source: "send_email" }))) {
      await ErrorDB.create({
        message: error.message,
        source: "send_email",
        stack: error.stack,
      });
    }

    return { status: false, message: error.message };
  }
};
