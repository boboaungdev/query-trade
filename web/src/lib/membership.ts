import type { Subscription } from "@/api/subscription";
import type { UserMembership } from "@/components/user-membership";

export type PlanTier = "free" | "plus" | "pro";

export function getPlanTierFromMembership(
  membership?: UserMembership | null,
): PlanTier {
  const rawPlan =
    membership?.plan ?? membership?.verifiedVariant ?? membership?.badgeVariant;
  const normalizedPlan = String(rawPlan ?? "free")
    .trim()
    .toLowerCase();

  if (normalizedPlan === "pro") return "pro";
  if (normalizedPlan === "plus") return "plus";

  return "free";
}

export function getEffectivePlanTier({
  membership,
  subscription,
}: {
  membership?: UserMembership | null;
  subscription?: Pick<Subscription, "plan"> | null;
}): PlanTier {
  if (subscription?.plan) {
    const normalizedPlan = String(subscription.plan).trim().toLowerCase();

    if (normalizedPlan === "pro") return "pro";
    if (normalizedPlan === "plus") return "plus";
  }

  return getPlanTierFromMembership(membership);
}

export function hasPaidPlan(tier: PlanTier) {
  return tier === "plus" || tier === "pro";
}
