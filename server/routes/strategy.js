import express from "express";

import {
  validateBody,
  validateParam,
  validateQuery,
  validateToken,
} from "../utils/validator.js";
import { StrategySchema } from "../schemas/strategy.js";
import { createStrategy } from "../controllers/strategy/create.js";
import { updateStrategy } from "../controllers/strategy/update.js";
import { deleteStrategy } from "../controllers/strategy/delete.js";
import { getStrategies, getStrategyById } from "../controllers/strategy/get.js";

const router = express.Router();
router.use(validateToken());

router
  .route("/")
  .get(validateQuery(StrategySchema.query.getStrategies), getStrategies)
  .post(validateBody(StrategySchema.create), createStrategy);

router
  .route("/:strategyId")
  .get(validateParam(StrategySchema.params.strategyId), getStrategyById)
  .patch(
    validateParam(StrategySchema.params.strategyId),
    validateBody(StrategySchema.update),
    updateStrategy,
  )
  .delete(validateParam(StrategySchema.params.strategyId), deleteStrategy);

export const strategyRouter = router;
