import { resError } from "../../utils/response.js";

function getStrategyOwnerId(strategy) {
  if (!strategy?.user) {
    return null;
  }

  if (
    typeof strategy.user === "object" &&
    strategy.user !== null &&
    "_id" in strategy.user
  ) {
    return strategy.user._id;
  }

  return strategy.user;
}

export function isStrategyAccessible(strategy, viewerId) {
  if (!strategy) {
    return false;
  }

  if (strategy.isPublic !== false) {
    return true;
  }

  if (!viewerId) {
    return false;
  }

  return String(getStrategyOwnerId(strategy)) === String(viewerId);
}

export function ensureStrategyAccessible(strategy, viewerId) {
  if (!isStrategyAccessible(strategy, viewerId)) {
    throw resError(404, "Strategy not found!");
  }
}

export function buildAccessibleStrategyFilter(viewerId) {
  if (!viewerId) {
    return { isPublic: true };
  }

  return {
    $or: [{ isPublic: true }, { user: viewerId }],
  };
}
