import express from "express";

import { FollowSchema } from "../schemas/follow.js";
import { createFollow } from "../controllers/follow/create.js";
import { deleteFollow } from "../controllers/follow/delete.js";
import {
  getFollowers,
  getFollowing,
  getFollowStatus,
} from "../controllers/follow/get.js";
import {
  validateParam,
  validateQuery,
  validateToken,
} from "../utils/validator.js";

const router = express.Router();

router.get(
  "/followers/:userId",
  validateParam(FollowSchema.params.userId),
  validateQuery(FollowSchema.query.list),
  getFollowers,
);

router.get(
  "/following/:userId",
  validateParam(FollowSchema.params.userId),
  validateQuery(FollowSchema.query.list),
  getFollowing,
);

router.get(
  "/status/:userId",
  validateToken(),
  validateParam(FollowSchema.params.userId),
  getFollowStatus,
);

router.post(
  "/:userId",
  validateToken(),
  validateParam(FollowSchema.params.userId),
  createFollow,
);

router.delete(
  "/:userId",
  validateToken(),
  validateParam(FollowSchema.params.userId),
  deleteFollow,
);

export const followRouter = router;
