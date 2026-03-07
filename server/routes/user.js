import express from "express";

import {
  validateBody,
  validateCookie,
  validateToken,
} from "../utils/validator.js";
import { UserSchema } from "../utils/schemas/user.js";
import { signup, signupVerify } from "../controllers/user/signup.js";
import { signin, signinGoogle } from "../controllers/user/signin.js";
import { signout } from "../controllers/user/signout.js";
import { profile } from "../controllers/user/profile.js";
import { refresh } from "../controllers/user/refresh.js";

const router = express.Router();

router.post("/signup", validateBody(UserSchema.signup), signup);

router.post(
  "/signup/verify",
  validateBody(UserSchema.signupVerify),
  signupVerify,
);

router.post("/signin", validateBody(UserSchema.signin), signin);

router.post(
  "/signin/google",
  validateBody(UserSchema.signinGoogle),
  signinGoogle,
);

router.post("/signout", validateToken(), signout);

router.get("/profile", validateToken(), profile);

router.post("/refresh", validateToken(), validateCookie(), refresh);

export const userRouter = router;
