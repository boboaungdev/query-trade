import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  BookMarked,
  CandlestickChart,
  CirclePlus,
  Clock3,
  ShieldCheck,
  Sparkles,
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
      access: "Paid strategy publishing unlocked",
      backtest: "All history and all timeframes",
      accentClassName:
        "border-amber-500/20 bg-amber-500/8 text-amber-600 dark:text-amber-400",
    };
  }

  if (planTier === "plus") {
    return {
      label: "Plus",
      summary: "Expanded research workspace for active strategy builders.",
      indicators: "5 indicators",
      rules: "5 rules per entry",
      access: "Paid strategy publishing unlocked",
      backtest: "Up to 1 year of backtest range",
      accentClassName:
        "border-sky-500/20 bg-sky-500/8 text-sky-600 dark:text-sky-400",
    };
  }

  return {
    label: "Free",
    summary: "A focused starter workspace for building your first systems.",
    indicators: "2 indicators",
    rules: "2 rules per entry",
    access: "Public free strategies only",
    backtest: "Up to 3 months of backtest range",
    accentClassName: "border-primary/15 bg-primary/8 text-primary",
  };
}

const quickActionCards = [
  {
    title: "Create a strategy",
    description: "Open the builder and sketch out new entry, TP, and SL logic.",
    to: "/strategy",
    state: { openStrategyBuilder: true },
    icon: CirclePlus,
  },
  {
    title: "Run a backtest",
    description:
      "Take a strategy through historical data before you trust it live.",
    to: "/backtest",
    icon: CandlestickChart,
  },
  {
    title: "Top up your wallet",
    description:
      "Check your token balance, deposit, and get ready for upgrades.",
    to: "/wallet",
    icon: Wallet,
  },
];

const workspaceCards = [
  {
    title: "Strategy Lab",
    description: "Browse, clone, and refine strategies from your library.",
    to: "/strategy",
    icon: Target,
  },
  {
    title: "Bookmarks",
    description: "Jump back into setups you want to study or reuse later.",
    to: "/bookmark",
    icon: BookMarked,
  },
  {
    title: "Pricing",
    description: "Compare plan limits and unlock a larger research surface.",
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.02),rgba(59,130,246,0.04))]">
        <CardContent className="px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                Dashboard
              </span>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    Welcome back, {firstName}
                  </h1>
                  <UserMembershipMark
                    membership={user?.membership}
                    interactive
                  />
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  Your trading workspace is ready. Build ideas, validate them,
                  and keep your research moving without bouncing between pages.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
              <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  Balance
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatCompactTokenAmount(tokenBalance)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  Strategies
                </p>
                <p className="mt-1 text-lg font-semibold">{strategyCount}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  Backtests
                </p>
                <p className="mt-1 text-lg font-semibold">{backtestCount}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  Network
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {followerCount}/{followingCount}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)]">
        <div className="space-y-5">
          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Start
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                Pick up the next piece of work with one tap.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {quickActionCards.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  state={"state" in item ? item.state : undefined}
                  className="group rounded-2xl border border-border/60 bg-muted/15 p-4 transition-colors hover:border-primary/25 hover:bg-primary/5"
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
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                Workspace
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                The core areas you will likely bounce between most often.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {workspaceCards.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:border-primary/25 hover:bg-primary/5"
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

        <div className="space-y-5">
          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Plan Snapshot
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                A simple read on what your current workspace can do.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  planCapabilities.accentClassName,
                )}
              >
                <p className="text-[11px] font-medium tracking-[0.16em] uppercase">
                  {planCapabilities.label} Plan
                </p>
                <p className="mt-1 text-sm leading-6">
                  {planCapabilities.summary}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-muted-foreground">Strategy indicators</p>
                  <p className="text-right font-medium">
                    {planCapabilities.indicators}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-muted-foreground">Rule complexity</p>
                  <p className="text-right font-medium">
                    {planCapabilities.rules}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-muted-foreground">Publishing access</p>
                  <p className="text-right font-medium">
                    {planCapabilities.access}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-muted-foreground">Backtest range</p>
                  <p className="text-right font-medium">
                    {planCapabilities.backtest}
                  </p>
                </div>
              </div>

              {planTier !== "pro" ? (
                <Button asChild className="w-full">
                  <Link to="/pricing">See upgrade options</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <CardTitle>Suggested Flow</CardTitle>
              <CardDescription className="text-sm leading-6">
                A practical loop for building inside Query Trade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Start with a simple entry idea and keep your first rule set small.",
                "Run a backtest before adding more indicators or complexity.",
                "Save token for the workflows you use most often, then upgrade when the limits are actually holding you back.",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/15 px-3 py-3"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
