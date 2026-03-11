import nodemailer from "nodemailer";

import { APP_NAME, EMAIL_PASSWORD, EMAIL_USER } from "../constants/index.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: `${APP_NAME} <${EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
