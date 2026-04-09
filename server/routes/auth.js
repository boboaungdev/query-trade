import express from "express";

import {
  validateBody,
  validateCookie,
  validateToken,
} from "../utils/validator.js";
import {
  checkChangeEmail,
  verifyChangeEmail,
} from "../controllers/auth/changeEmail.js";
import {
  changePassword,
  verifyChangePassword,
} from "../controllers/auth/changePassword.js";
import {
  connectGoogle,
  disconnectGoogle,
} from "../controllers/auth/googleAccount.js";
import { UserSchema } from "../schemas/user.js";
import { update } from "../controllers/auth/update.js";
import { signout } from "../controllers/auth/signout.js";
import { refresh } from "../controllers/auth/refresh.js";
import { existUser } from "../controllers/auth/existUser.js";
import {
  deleteAccount,
  deleteAccountVerify,
} from "../controllers/auth/deleteAccount.js";
import { signin, signinGoogle } from "../controllers/auth/signin.js";
import { signup, signupVerify } from "../controllers/auth/signup.js";
import { resetPassword } from "../controllers/auth/resetPassword.js";
import { forgotPassword } from "../controllers/auth/forgotPassword.js";
import { createPassword } from "../controllers/auth/createPassword.js";
import { forgotPasswordVerify } from "../controllers/auth/forgotPasswrodVerify.js";

const router = express.Router();

router
  .route("/")
  .patch(validateToken(), validateBody(UserSchema.update), update);

router
  .route("/delete")
  .post(validateToken(), deleteAccountVerify)
  .delete(
    validateToken(),
    validateBody(UserSchema.deleteAccount),
    deleteAccount,
  );

router.post("/exist-user", validateBody(UserSchema.existUser), existUser);

router.post("/signin", validateBody(UserSchema.signin), signin);

router.post("/signup", validateBody(UserSchema.signup), signup);

router.post(
  "/signup-verify",
  validateBody(UserSchema.signupVerify),
  signupVerify,
);

router.post(
  "/signin-google",
  validateBody(UserSchema.signinGoogle),
  signinGoogle,
);

router.post(
  "/forgot-password",
  validateBody(UserSchema.forgotPassword),
  forgotPassword,
);

router.post(
  "/forgot-password-verify",
  validateBody(UserSchema.forgotPasswordVerify),
  forgotPasswordVerify,
);

router.post(
  "/reset-password",
  validateBody(UserSchema.resetPassword),
  resetPassword,
);

router.post("/signout", validateCookie(), signout);

router.post("/refresh", validateCookie(), refresh);

router.post(
  "/check-change-email",
  validateToken(),
  validateBody(UserSchema.checkChangeEmail),
  checkChangeEmail,
);

router.patch(
  "/verify-change-email",
  validateToken(),
  validateBody(UserSchema.verifyChangeEmail),
  verifyChangeEmail,
);

router.patch(
  "/change-password",
  validateToken(),
  validateBody(UserSchema.changePassword),
  changePassword,
);

router.patch(
  "/verify-change-password",
  validateToken(),
  validateBody(UserSchema.verifyChangePassword),
  verifyChangePassword,
);

router.patch(
  "/create-password",
  validateToken(),
  validateBody(UserSchema.createPassword),
  createPassword,
);

router.patch(
  "/connect-google",
  validateToken(),
  validateBody(UserSchema.connectGoogle),
  connectGoogle,
);

router.patch("/disconnect-google", validateToken(), disconnectGoogle);

export const authRouter = router;
