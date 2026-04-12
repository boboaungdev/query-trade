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

const persistSendEmailError = async (error) => {
  if (!(await ErrorDB.exists({ source: "send_email" }))) {
    await ErrorDB.create({
      message: error.message,
      source: "send_email",
      stack: error.stack,
    });
  }
};

const classifySendEmailError = (error) => {
  switch (error?.code) {
    case "ECONNECTION":
    case "ETIMEDOUT":
      return {
        type: "network",
        message: "Email service network error. Please try again later.",
      };
    case "EAUTH":
      return {
        type: "auth",
        message: "Email service authentication failed.",
      };
    case "EENVELOPE":
      return {
        type: "recipient",
        message: "Invalid recipient email address.",
      };
    default: {
      const responseCode = error?.responseCode;
      const response = error?.response?.toLowerCase?.() ?? "";
      const rejected = Array.isArray(error?.rejected) ? error.rejected : [];
      const isRecipientError =
        [450, 451, 452, 550, 551, 552, 553].includes(responseCode) ||
        rejected.length > 0 ||
        response.includes("recipient") ||
        response.includes("mailbox unavailable") ||
        response.includes("user unknown") ||
        response.includes("no such user") ||
        response.includes("invalid address");

      return isRecipientError
        ? {
            type: "recipient",
            message: "Unable to deliver email to this address.",
          }
        : {
            type: "server",
            message: "Email service failed to send the message.",
          };
    }
  }
};

const verifyEmailTransporter = async () => {
  try {
    await transporter.verify();
    await ErrorDB.deleteOne({ source: "send_email" });
    console.log("=> Email server is ready to take messages.");
  } catch (error) {
    await persistSendEmailError(error);
    console.error("=> Email transporter verification failed:", error.message);
  }
};

void verifyEmailTransporter();

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const result = await transporter.sendMail({
      from: `${APP_NAME} <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    if (Array.isArray(result.rejected) && result.rejected.length > 0) {
      return {
        status: false,
        type: "recipient",
        message: "Some recipients were rejected.",
        rawMessage: `Rejected recipients: ${result.rejected.join(", ")}`,
        result,
      };
    }

    await ErrorDB.deleteOne({ source: "send_email" });

    return { status: true, message: "Success send email", result };
  } catch (error) {
    const classifiedError = classifySendEmailError(error);

    return {
      status: false,
      ...classifiedError,
      rawMessage: error.message,
      rejected: Array.isArray(error?.rejected) ? error.rejected : [],
    };
  }
};
