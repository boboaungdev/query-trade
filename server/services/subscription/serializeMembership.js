export const serializeMembership = (subscription) => {
  const now = new Date();
  const isExpired =
    subscription?.plan !== "free" &&
    subscription?.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) <= now;
  const plan = isExpired ? "free" : (subscription?.plan ?? "free");

  switch (plan) {
    case "pro":
      return {
        plan: "pro",
        badgeLabel: "Pro",
        badgeVariant: "pro",
        verifiedVariant: "pro",
        title: "Pro Member",
        description: "Top-tier membership",
      };
    case "plus":
      return {
        plan: "plus",
        badgeLabel: "Plus",
        badgeVariant: "plus",
        verifiedVariant: "plus",
        title: "Plus Member",
        description: "Premium membership",
      };
    default:
      return {
        plan: "free",
        badgeLabel: null,
        badgeVariant: "free",
        verifiedVariant: "free",
        title: null,
        description: null,
      };
  }
};
