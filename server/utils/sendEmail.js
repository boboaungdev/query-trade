import nodemailer from "nodemailer";

import { APP_NAME } from "../constants/index.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: `${APP_NAME} <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
