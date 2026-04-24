export const defaultSubscriptionPlans = [
  {
    key: "free",
    name: "Free",
    amountToken: 0,
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
    amountToken: 10000,
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
    amountToken: 50000,
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
