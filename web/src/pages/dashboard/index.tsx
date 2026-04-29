import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  BookMarked,
  CandlestickChart,
  CirclePlus,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
import { formatCompactTokenAmount } from "@/lib/formatTokenAmount";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

function getDashboardPlanTier(membership?: UserMembership) {
  const rawPlan =
    membership?.plan ?? membership?.verifiedVariant ?? membership?.badgeVariant;
  const normalizedPlan = String(rawPlan ?? "free")
    .trim()
    .toLowerCase();

  if (normalizedPlan === "pro") return "pro";
  if (normalizedPlan === "plus") return "plus";
  return "free";
}

function getPlanCapabilities(planTier: "free" | "plus" | "pro") {
  if (planTier === "pro") {
    return {
      label: "Pro",
      summary: "Full strategy builder access with the highest limits.",
      indicators: "10 indicators",
      rules: "10 rules per entry",
      access: "Paid publishing unlocked",
      backtest: "All history and all timeframes",
      accentClassName:
        "border-amber-500/20 bg-amber-500/8 text-amber-600 dark:text-amber-300",
    };
  }

  if (planTier === "plus") {
    return {
      label: "Plus",
      summary: "Expanded workspace for active strategy research.",
      indicators: "5 indicators",
      rules: "5 rules per entry",
      access: "Paid publishing unlocked",
      backtest: "Up to 1 year of range",
      accentClassName:
        "border-sky-500/20 bg-sky-500/8 text-sky-600 dark:text-sky-300",
    };
  }

  return {
    label: "Free",
    summary: "A focused starter workspace for building your first systems.",
    indicators: "2 indicators",
    rules: "2 rules per entry",
    access: "Public free strategies only",
    backtest: "Up to 3 months of range",
    accentClassName: "border-primary/15 bg-primary/8 text-primary",
  };
}

const quickActions = [
  {
    title: "Create strategy",
    description: "Start a new strategy from the builder.",
    to: "/strategy",
    state: { openStrategyBuilder: true },
    icon: CirclePlus,
  },
  {
    title: "Run backtest",
    description: "Validate a strategy against historical data.",
    to: "/backtest",
    icon: CandlestickChart,
  },
  {
    title: "Open wallet",
    description: "Check balance and top up your tokens.",
    to: "/wallet",
    icon: Wallet,
  },
];

const workspaceLinks = [
  {
    title: "Strategy Lab",
    description: "View, manage, and refine your strategies.",
    to: "/strategy",
    icon: Target,
  },
  {
    title: "Bookmarks",
    description: "Return to strategies you saved earlier.",
    to: "/bookmark",
    icon: BookMarked,
  },
  {
    title: "Pricing",
    description: "Review plan limits and upgrade options.",
    to: "/pricing",
    icon: BadgeDollarSign,
  },
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const planTier = getDashboardPlanTier(user?.membership);
  const planCapabilities = getPlanCapabilities(planTier);

  const tokenBalance = Number(user?.tokenBalance ?? 0);
  const strategyCount = Number(user?.stats?.strategyCount ?? 0);
  const backtestCount = Number(user?.stats?.backtestCount ?? 0);
  const followerCount = Number(user?.stats?.followerCount ?? 0);
  const followingCount = Number(user?.stats?.followingCount ?? 0);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Trader";

  const stats = [
    {
      label: "Token balance",
      value: formatCompactTokenAmount(tokenBalance),
    },
    {
      label: "Strategies",
      value: strategyCount.toString(),
    },
    {
      label: "Backtests",
      value: backtestCount.toString(),
    },
    {
      label: "Network",
      value: `${followerCount}/${followingCount}`,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Card className="border-border/70">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Welcome back, {firstName}
            </h1>
            <UserMembershipMark membership={user?.membership} interactive />
          </div>
          <CardDescription className="max-w-2xl text-sm leading-6">
            Pick up where you left off and jump straight into your next task.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4"
            >
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {item.value}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Common tasks you might want to open next.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  state={"state" in item ? item.state : undefined}
                  className="group rounded-xl border border-border/70 bg-background px-4 py-4 transition-colors hover:bg-muted/30"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>
                Main areas you will use most often.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {workspaceLinks.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="rounded-xl border border-border/70 bg-background px-4 py-4 transition-colors hover:bg-muted/30"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Plan snapshot
              </CardTitle>
              <CardDescription>
                Your current workspace limits and access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "rounded-xl border px-4 py-3",
                  planCapabilities.accentClassName,
                )}
              >
                <p className="text-sm font-semibold">{planCapabilities.label} plan</p>
                <p className="mt-1 text-sm leading-6">{planCapabilities.summary}</p>
              </div>

              <div className="space-y-3">
                {[
                  ["Indicators", planCapabilities.indicators],
                  ["Rule complexity", planCapabilities.rules],
                  ["Publishing access", planCapabilities.access],
                  ["Backtest range", planCapabilities.backtest],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-3"
                  >
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="max-w-40 text-right text-sm font-medium">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {planTier !== "pro" ? (
                <Button asChild className="w-full">
                  <Link to="/pricing">See upgrade options</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
