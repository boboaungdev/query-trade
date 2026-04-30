import { API_URL } from "@/lib/constants";

export type SubscriptionPlanCardItem = {
  id: string;
  key: string;
  name: string;
  priceLabel: string;
  originalPriceLabel: string;
  summary: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  amountToken: number;
  originalAmountToken: number;
  discountAmountToken: number;
  discountPercentage: number;
  hasDiscount: boolean;
  durationDays: number;
};

type SubscriptionPlanApiItem = {
  id: string;
  key: string;
  name: string;
  amountToken: number;
  originalAmountToken: number;
  discountAmountToken: number;
  hasDiscount: boolean;
  durationDays: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
};

function formatCompactNumber(value: number) {
  if (value >= 1_000_000_000) {
    const formatted = value / 1_000_000_000;
    return `${Number.isInteger(formatted) ? formatted : formatted.toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    const formatted = value / 1_000_000;
    return `${Number.isInteger(formatted) ? formatted : formatted.toFixed(1)}M`;
  }

  if (value >= 1_000) {
    const formatted = value / 1_000;
    return `${Number.isInteger(formatted) ? formatted : formatted.toFixed(1)}K`;
  }

  return `${value}`;
}

const planPresentation: Record<
  string,
  {
    summary: string;
    cta: string;
    highlighted?: boolean;
  }
> = {
  free: {
    summary:
      "A simple starting point for building strategies and exploring the workflow.",
    cta: "Start free",
  },
  plus: {
    summary:
      "More room to test ideas with stronger flexibility and broader workflow access.",
    cta: "See Plus",
    highlighted: true,
  },
  pro: {
    summary:
      "For traders who want the widest range of controls, depth, and strategy freedom.",
    cta: "See Pro",
  },
} as const;

const fallbackPlans: SubscriptionPlanCardItem[] = [
  {
    id: "free",
    key: "free",
    name: "Free",
    priceLabel: "$0",
    originalPriceLabel: "$0",
    summary: planPresentation.free.summary,
    features: [
      "Create strategies with up to 2 indicators",
      "Use up to 2 rules per buy and sell entry",
      "Access 5000+ market symbols",
      "Use the wallet system",
      "Run backtests on popular timeframes",
      "Use up to 3 months of backtest history",
      "Browse public free strategies and manage your profile",
    ],
    cta: planPresentation.free.cta,
    amountToken: 0,
    originalAmountToken: 0,
    discountAmountToken: 0,
    discountPercentage: 0,
    hasDiscount: false,
    durationDays: 0,
  },
  {
    id: "plus",
    key: "plus",
    name: "Plus",
    priceLabel: "10000 token / 30d",
    originalPriceLabel: "10000 token / 30d",
    summary: planPresentation.plus.summary,
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
    cta: planPresentation.plus.cta,
    highlighted: true,
    amountToken: 10000,
    originalAmountToken: 10000,
    discountAmountToken: 0,
    discountPercentage: 0,
    hasDiscount: false,
    durationDays: 30,
  },
  {
    id: "pro",
    key: "pro",
    name: "Pro",
    priceLabel: "50000 token / 30d",
    originalPriceLabel: "50000 token / 30d",
    summary: planPresentation.pro.summary,
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
    cta: planPresentation.pro.cta,
    amountToken: 50000,
    originalAmountToken: 50000,
    discountAmountToken: 0,
    discountPercentage: 0,
    hasDiscount: false,
    durationDays: 30,
  },
];

function formatPlanPrice(plan: SubscriptionPlanApiItem) {
  if (!plan.amountToken) {
    return "$0";
  }

  return `${formatCompactNumber(plan.amountToken)} token / ${plan.durationDays}d`;
}

function formatOriginalPlanPrice(plan: SubscriptionPlanApiItem) {
  if (!plan.originalAmountToken) {
    return "$0";
  }

  return `${formatCompactNumber(plan.originalAmountToken)} token / ${plan.durationDays}d`;
}

function mapPlan(plan: SubscriptionPlanApiItem): SubscriptionPlanCardItem {
  const presentation =
    planPresentation[plan.key as keyof typeof planPresentation] ?? {};
  const discountPercentage =
    plan.hasDiscount && plan.originalAmountToken > 0
      ? Math.round((plan.discountAmountToken / plan.originalAmountToken) * 100)
      : 0;

  return {
    id: plan.id,
    key: plan.key,
    name: plan.name,
    priceLabel: formatPlanPrice(plan),
    originalPriceLabel: formatOriginalPlanPrice(plan),
    summary:
      presentation.summary ??
      "A subscription plan for broader trading workflow access.",
    features: plan.features ?? [],
    cta: presentation.cta ?? "View plan",
    highlighted: presentation.highlighted,
    amountToken: plan.amountToken,
    originalAmountToken: plan.originalAmountToken,
    discountAmountToken: plan.discountAmountToken,
    discountPercentage,
    hasDiscount: plan.hasDiscount,
    durationDays: plan.durationDays,
  };
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlanCardItem[]> {
  try {
    const response = await fetch(`${API_URL}/api/subscription/plans`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch plans: ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: { plans?: SubscriptionPlanApiItem[] };
    };

    const plans = payload.result?.plans ?? [];

    if (!plans.length) {
      return fallbackPlans;
    }

    return plans.map(mapPlan);
  } catch {
    return fallbackPlans;
  }
}
