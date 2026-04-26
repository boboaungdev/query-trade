import { resError } from "../../utils/response.js";

const FREE_PLAN_SUPPORTED_TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];
const PRO_PLAN_ONLY_TIMEFRAMES = ["6h", "12h", "1M"];
const PLUS_PLAN_SUPPORTED_TIMEFRAMES = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "8h",
  "1d",
  "1w",
];

export function getAllowedBacktestTimeframes(viewerPlan) {
  if (viewerPlan === "pro") {
    return null;
  }

  if (viewerPlan === "plus") {
    return PLUS_PLAN_SUPPORTED_TIMEFRAMES;
  }

  return FREE_PLAN_SUPPORTED_TIMEFRAMES;
}

export function assertBacktestTimeframeAllowed(viewerPlan, timeframe) {
  const allowedTimeframes = getAllowedBacktestTimeframes(viewerPlan);

  if (!allowedTimeframes || allowedTimeframes.includes(timeframe)) {
    return;
  }

  if (PRO_PLAN_ONLY_TIMEFRAMES.includes(timeframe)) {
    throw resError(403, `The '${timeframe}' timeframe requires a Pro plan.`);
  }

  throw resError(
    403,
    `The '${timeframe}' timeframe requires a Plus or Pro plan.`,
  );
}

