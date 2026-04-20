import express from "express";
import { UserSchema } from "../schemas/user.js";
import {
  validateOptionalToken,
  validateParam,
  validateQuery,
} from "../utils/validator.js";
import { getUserByUsername } from "../controllers/user/get.js";
import {
  getUserBacktests,
  getUserFollows,
  getUserStrategies,
} from "../controllers/user/lists.js";

const router = express.Router();

router.get(
  "/:username/follows",
  validateOptionalToken(),
  validateParam(UserSchema.params.username),
  validateQuery(UserSchema.query.profileFollows),
  getUserFollows,
);

router.get(
  "/:username/strategies",
  validateOptionalToken(),
  validateParam(UserSchema.params.username),
  validateQuery(UserSchema.query.profileStrategies),
  getUserStrategies,
);

router.get(
  "/:username/backtests",
  validateOptionalToken(),
  validateParam(UserSchema.params.username),
  validateQuery(UserSchema.query.profileBacktests),
  getUserBacktests,
);

router.get(
  "/:username",
  validateOptionalToken(),
  validateParam(UserSchema.params.username),
  getUserByUsername,
);

export const userRouter = router;
