import express from "express";

import {
  validateBody,
  validateParam,
  validateQuery,
  validateToken,
} from "../utils/validator.js";
import { BookmarkSchema } from "../schemas/bookmark.js";
import { getBookmarks } from "../controllers/bookmark/get.js";
import { createBookmark } from "../controllers/bookmark/create.js";
import { deleteBookmark } from "../controllers/bookmark/delete.js";

const router = express.Router();

router.use(validateToken());

router
  .route("/")
  .post(validateBody(BookmarkSchema.create), createBookmark)
  .get(validateQuery(BookmarkSchema.query.getBookmarks), getBookmarks);

router
  .route("/:targetType/:targetId")
  .delete(validateParam(BookmarkSchema.params.deleteBookmark), deleteBookmark);

export const bookmarkRouter = router;
