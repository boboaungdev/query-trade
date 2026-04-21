export const defaultSubscriptionPlans = [
  {
    key: "free",
    name: "Free",
    amountUsd: 0,
    durationDays: 0,
    features: [
      "Basic dashboard access",
      "Starter strategy tools",
      "Community profile",
    ],
    isActive: true,
    sortOrder: 0,
  },
  {
    key: "plus",
    name: "Plus",
    amountUsd: 10,
    durationDays: 30,
    features: [
      "More strategy and backtest usage",
      "Saved watchlists and signals",
      "Priority access to new tools",
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    key: "pro",
    name: "Pro",
    amountUsd: 50,
    durationDays: 30,
    features: [
      "Highest usage limits",
      "Advanced analytics and exports",
      "Pro strategy research tools",
    ],
    isActive: true,
    sortOrder: 2,
  },
];
