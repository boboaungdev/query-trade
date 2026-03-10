import express from "express";

import {
  validateBody,
  validateCookie,
  validateToken,
} from "../utils/validator.js";
import { UserSchema } from "../utils/schemas/user.js";
import { existUser } from "../controllers/auth/existUser.js";
import { signin, signinGoogle } from "../controllers/auth/signin.js";
import { signup, signupVerify } from "../controllers/auth/signup.js";
import { forgotPassword } from "../controllers/auth/forgotPassword.js";
import { forgotPasswordVerify } from "../controllers/auth/forgotPasswrodVerify.js";
import { resetPassword } from "../controllers/auth/resetPassword.js";
import { signout } from "../controllers/auth/signout.js";
import { refresh } from "../controllers/auth/refresh.js";
import { update } from "../controllers/auth/update.js";
import {
  checkChangeEmail,
  verifyChangeEmail,
} from "../controllers/auth/changeEmail.js";

const router = express.Router();

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

router.post("/signout", validateToken(), signout);

router.post("/refresh", validateToken(), validateCookie(), refresh);

router.patch(
  "/update",
  validateToken(),
  validateBody(UserSchema.update),
  update,
);

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

// router.get("/profile", validateToken(), profile);

export const authRouter = router;
