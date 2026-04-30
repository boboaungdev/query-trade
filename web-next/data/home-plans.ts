export type HomePlanItem = {
  name: string;
  priceLabel: string;
  summary: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

export const homePlans: HomePlanItem[] = [
  {
    name: "Free",
    priceLabel: "$0",
    summary:
      "A simple starting point for building strategies and exploring the workflow.",
    features: [
      "Create strategies with up to 2 indicators",
      "Use up to 2 rules per buy and sell entry",
      "Access 5000+ market symbols",
      "Use the wallet system",
      "Run backtests on popular timeframes",
      "Use up to 3 months of backtest history",
      "Browse public free strategies and manage your profile",
    ],
    cta: "Start free",
  },
  {
    name: "Plus",
    priceLabel: "10000 token / 30d",
    summary:
      "More room to test ideas with stronger flexibility and broader workflow access.",
    features: [
      "Includes all Free features",
      "Create strategies with up to 5 indicators",
      "Use up to 5 rules per buy and sell entry",
      "Show your Plus member badge across the app",
      "Unlock paid strategy publishing and paid strategy access",
      "Earn token when users backtest your paid strategies",
      "Run backtests on 1m to 1w supported timeframes",
      "Use up to 1 year of backtest history",
      "Edit capital settings and use hedge mode",
    ],
    cta: "See Plus",
    highlighted: true,
  },
  {
    name: "Pro",
    priceLabel: "50000 token / 30d",
    summary:
      "For traders who want the widest range of controls, depth, and strategy freedom.",
    features: [
      "Includes all Plus features",
      "Create strategies with up to 10 indicators",
      "Use up to 10 rules per buy and sell entry",
      "Show your Pro member badge across the app",
      "Access premium Pro strategies",
      "Full paid strategy publishing and access",
      "Run backtests on all timeframes",
      "Use unlimited backtest date range",
    ],
    cta: "See Pro",
  },
];
