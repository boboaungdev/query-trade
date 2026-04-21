import express from "express";

import {
  validateBody,
  validateParam,
  validateQuery,
  validateRole,
  validateToken,
} from "../utils/validator.js";
import {
  getIndicatorById,
  getIndicators,
} from "../controllers/indicator/get.js";
import { IndicatorSchema } from "../schemas/indicator.js";
import { createIndicator } from "../controllers/indicator/create.js";
import { updateIndicator } from "../controllers/indicator/update.js";
import { deleteIndicator } from "../controllers/indicator/delete.js";

const router = express.Router();

// Apply token validation middleware to all routes in this router
router.use(validateToken());

router
  .route("/admin")
  .post(
    validateRole("admin"),
    validateBody(IndicatorSchema.create),
    createIndicator,
  );

router
  .route("/admin/:indicatorId")
  .patch(
    validateRole("admin"),
    validateParam(IndicatorSchema.params.indicatorId),
    validateBody(IndicatorSchema.update),
    updateIndicator,
  )
  .delete(
    validateRole("admin"),
    validateParam(IndicatorSchema.params.indicatorId),
    deleteIndicator,
  );

router
  .route("/")
  .get(validateQuery(IndicatorSchema.query.getIndicators), getIndicators);

router
  .route("/:indicatorId")
  .get(validateParam(IndicatorSchema.params.indicatorId), getIndicatorById);

export const indicatorRouter = router;
