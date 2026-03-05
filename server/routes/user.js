import express from "express";

import {
  validateBody,
  validateCookie,
  // validateQuery,
  validateToken,
} from "../utils/validator.js";
import { UserSchema } from "../utils/schemas/user.js";
import { signup } from "../controllers/user/signup.js";
import { signin, signinGoogle } from "../controllers/user/signin.js";
import { signout } from "../controllers/user/signout.js";
import { profile } from "../controllers/user/profile.js";
import { refresh } from "../controllers/user/refresh.js";
import { signupVerify } from "../controllers/user/signupVerify.js";

const router = express.Router();

// router.get("/exist-email", validateQuery(UserSchema.existEmail), existEmail);

// router.get(
//   "/exist-username",
//   validateQuery(UserSchema.existUsername),
//   existUsername,
// );

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

router.post("/signout", validateToken(), validateCookie(), signout);

router.get("/profile", validateToken(), profile);

router.post("/refresh", validateCookie(), refresh);

export const userRouter = router;
