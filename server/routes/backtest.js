import express from "express";
import { validateBody, validateToken } from "../utils/validator.js";
import { runBacktest } from "../controllers/backtest/run.js";
import { BacktestSchema } from "../utils/schemas/backtest.js";
import { exchangeSupportedData } from "../controllers/backtest/exchangeSupportedData.js";

const router = express.Router();

router.post(
  "/run",
  validateToken(),
  validateBody(BacktestSchema.run),
  runBacktest,
);

router.post(
  "/exchange-supported-data",
  validateToken(),
  validateBody(BacktestSchema.exchangeSupportedData),
  exchangeSupportedData,
);

export const backtestRouter = router;
