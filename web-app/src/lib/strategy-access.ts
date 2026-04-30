import type { StrategyAccessState, StrategyAccessType } from "@/api/strategy";

import type { PlanTier } from "@/lib/membership";
import { hasPaidPlan } from "@/lib/membership";

export function isStrategyPreviewLocked({
  isPublic,
  accessType,
  access,
  ownerId,
  viewerId,
  planTier,
}: {
  isPublic?: boolean;
  accessType?: StrategyAccessType;
  access?:
    | StrategyAccessState
    | { accessType?: StrategyAccessType; canUse?: boolean }
    | null;
  ownerId?: string;
  viewerId?: string;
  planTier: PlanTier;
}) {
  if (ownerId && viewerId && ownerId === viewerId) {
    return false;
  }

  const resolvedAccessType = access?.accessType ?? accessType ?? "free";

  if (isPublic === false || resolvedAccessType !== "paid") {
    return false;
  }

  if (typeof access?.canUse === "boolean") {
    return access.canUse === false;
  }

  return !hasPaidPlan(planTier);
}
