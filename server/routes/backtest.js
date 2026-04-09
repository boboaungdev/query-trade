import express from "express";

import {
  validateBody,
  validateParam,
  validateQuery,
  validateToken,
} from "../utils/validator.js";
import { BacktestSchema } from "../schemas/backtest.js";
import { createBacktest } from "../controllers/backtest/create.js";
import { getExchangeData } from "../controllers/backtest/getExchangeData.js";
import { getBacktestById, getBacktests } from "../controllers/backtest/get.js";
import { updateBacktest } from "../controllers/backtest/update.js";
import { deleteBacktest } from "../controllers/backtest/delete.js";

const router = express.Router();
router.use(validateToken());

router
  .route("/")
  .post(validateBody(BacktestSchema.create), createBacktest)
  .get(validateQuery(BacktestSchema.query.getBacktests), getBacktests);

router.get(
  "/exchange-data",
  validateQuery(BacktestSchema.query.getExchangeData),
  getExchangeData,
);

router.get(
  "/:backtestId",
  validateParam(BacktestSchema.param.backtestId),
  getBacktestById,
);

router.patch(
  "/:backtestId",
  validateParam(BacktestSchema.param.backtestId),
  validateBody(BacktestSchema.update),
  updateBacktest,
);

router.delete(
  "/:backtestId",
  validateParam(BacktestSchema.param.backtestId),
  deleteBacktest,
);

export const backtestRouter = router;
