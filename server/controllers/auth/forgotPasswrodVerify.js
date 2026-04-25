import { VerificationModel } from "../../models/verify.js";
import { resError, resJson } from "../../utils/response.js";

export const forgotPasswordVerify = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!(await VerificationModel.exists({ email }))) {
      throw resError(404, "Invalid email!");
    }

    const record = await VerificationModel.findOne({ code });
    if (!record) {
      throw resError(400, "Incorrect verification code!");
    }

    if (record.expiresIn < new Date()) {
      throw resError(410, "Expired verification code!");
    }

    await VerificationModel.findByIdAndDelete(record._id);

    return resJson(res, 200, "Success verify, now reset your new password.");
  } catch (error) {
    next(error);
  }
};
