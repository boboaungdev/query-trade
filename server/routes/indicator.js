import express from "express";

import { createIndicator } from "../controllers/indicator/create.js";
import { IndicatorSchema } from "../utils/schemas/indicator.js";
import {
  validateBody,
  validateParam,
  validateQuery,
  validateRole,
  validateToken,
} from "../utils/validator.js";
import { updateIndicator } from "../controllers/indicator/update.js";
import { deleteIndicator } from "../controllers/indicator/delete.js";
import {
  getIndicatorById,
  getIndicators,
} from "../controllers/indicator/get.js";

const router = express.Router();

// Apply token validation middleware to all routes in this router
router.use(validateToken());

router
  .route("/")

  .get(validateQuery(IndicatorSchema.query.getIndicators), getIndicators)

  .post(
    validateRole("admin"),
    validateBody(IndicatorSchema.create),
    createIndicator,
  );

router
  .route("/:indicatorId")

  .get(validateParam(IndicatorSchema.params.indicatorId), getIndicatorById)

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

export const indicatorRouter = router;
