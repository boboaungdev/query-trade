import express from "express";
import { validateBody, validateToken } from "../utils/validator.js";
import { runBacktest } from "../controllers/backtest/run.js";
import { BacktestSchema } from "../utils/schemas/backtest.js";

const router = express.Router();

router.post(
  "/run",
  validateToken(),
  validateBody(BacktestSchema.runBacktest),
  runBacktest,
);

export const backtestRouter = router;
