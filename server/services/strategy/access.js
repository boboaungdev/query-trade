import { resError } from "../../utils/response.js";

export const STRATEGY_ACCESS_TYPES = {
  free: "free",
  paid: "paid",
};

const PAID_ELIGIBLE_PLANS = new Set(["plus", "pro"]);

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

export function normalizeStrategyAccessType(strategy) {
  return strategy?.accessType === STRATEGY_ACCESS_TYPES.paid
    ? STRATEGY_ACCESS_TYPES.paid
    : STRATEGY_ACCESS_TYPES.free;
}

export function sanitizeStrategyAccessPayload(payload) {
  const isPublic = payload?.isPublic !== false;
  const accessType =
    isPublic && payload?.accessType === STRATEGY_ACCESS_TYPES.paid
      ? STRATEGY_ACCESS_TYPES.paid
      : STRATEGY_ACCESS_TYPES.free;

  return {
    ...payload,
    isPublic,
    accessType,
  };
}

export function getViewerPlan(viewerSubscription) {
  return viewerSubscription?.plan ?? "free";
}

export function getStrategyIndicatorLimit(viewerPlan = "free") {
  if (viewerPlan === "pro") {
    return 10;
  }

  if (viewerPlan === "plus") {
    return 5;
  }

  return 2;
}

export function getStrategyRuleLimit(viewerPlan = "free") {
  if (viewerPlan === "pro") {
    return 10;
  }

  if (viewerPlan === "plus") {
    return 5;
  }

  return 2;
}

function getStrategyPlanLabel(viewerPlan = "free") {
  if (viewerPlan === "pro") {
    return "Pro";
  }

  if (viewerPlan === "plus") {
    return "Plus";
  }

  return "Free";
}

function countStrategyConditionNodes(nodes = []) {
  return nodes.reduce((count, node) => {
    if (Array.isArray(node?.conditions)) {
      return count + countStrategyConditionNodes(node.conditions);
    }

    return count + 1;
  }, 0);
}

export function ensureStrategyRuleLimit(strategy, viewerPlan = "free") {
  const maxRules = getStrategyRuleLimit(viewerPlan);
  const buyRuleCount = countStrategyConditionNodes(strategy?.entry?.buy?.conditions);
  const sellRuleCount = countStrategyConditionNodes(
    strategy?.entry?.sell?.conditions,
  );

  if (buyRuleCount <= maxRules && sellRuleCount <= maxRules) {
    return;
  }

  const overLimitEntries = [
    buyRuleCount > maxRules ? `Buy Entry has ${buyRuleCount}` : null,
    sellRuleCount > maxRules ? `Sell Entry has ${sellRuleCount}` : null,
  ].filter(Boolean);

  throw resError(
    403,
    `${getStrategyPlanLabel(viewerPlan)} plan allows up to ${maxRules} rules per entry. ${overLimitEntries.join(". ")}.`,
  );
}

export function canManagePaidStrategyAccess(viewerPlan = "free") {
  return PAID_ELIGIBLE_PLANS.has(viewerPlan);
}

export function canViewStrategy(strategy, viewerId) {
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

export function isStrategyAccessible(strategy, viewerId, viewerPlan = "free") {
  if (!canViewStrategy(strategy, viewerId)) {
    return false;
  }

  if (String(getStrategyOwnerId(strategy)) === String(viewerId)) {
    return true;
  }

  return (
    normalizeStrategyAccessType(strategy) !== STRATEGY_ACCESS_TYPES.paid ||
    PAID_ELIGIBLE_PLANS.has(viewerPlan)
  );
}

export function ensureStrategyAccessible(
  strategy,
  viewerId,
  viewerPlan = "free",
) {
  if (!canViewStrategy(strategy, viewerId)) {
    throw resError(404, "Strategy not found!");
  }

  if (!isStrategyAccessible(strategy, viewerId, viewerPlan)) {
    throw resError(
      403,
      "This paid strategy requires an active Plus or Pro subscription.",
    );
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

export function getStrategyAccessState(strategy, viewerId, viewerPlan = "free") {
  const isOwner =
    viewerId && String(getStrategyOwnerId(strategy)) === String(viewerId);
  const accessType = normalizeStrategyAccessType(strategy);
  const canUse = isStrategyAccessible(strategy, viewerId, viewerPlan);

  return {
    visibility: strategy?.isPublic === false ? "private" : "public",
    accessType,
    canUse,
    requiresUpgrade:
      !isOwner &&
      canViewStrategy(strategy, viewerId) &&
      accessType === STRATEGY_ACCESS_TYPES.paid &&
      !canUse,
  };
}
