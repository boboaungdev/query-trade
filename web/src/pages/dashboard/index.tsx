import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CandlestickChart,
  ChevronDown,
  Loader2,
  Users,
  Wallet,
} from "lucide-react";

import { getApiErrorMessage } from "@/api/axios";
import {
  getWalletActivity,
  getWalletIncomeChart,
  type WalletActivity,
  type WalletIncomeChartPoint,
  type WalletIncomeChartRange,
} from "@/api/wallet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCompactTokenAmount } from "@/lib/formatTokenAmount";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useWalletStore } from "@/store/wallet";

const dashboardDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const incomeChartConfig = {
  earned: {
    label: "Strategy income",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

const flowChartConfig = {
  amount: {
    label: "Token amount",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

const STRATEGY_INCOME_RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

function formatToken(value: number) {
  return `${formatCompactTokenAmount(value)} token`;
}

function formatUsd(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getActivityLabel(activityType: WalletActivity["activityType"]) {
  if (activityType === "reward") return "Earn";
  if (activityType === "deposit") return "Deposit";
  if (activityType === "subscription") return "Subscription";
  if (activityType === "send") return "Send";
  if (activityType === "receive") return "Receive";
  if (activityType === "withdraw") return "Withdraw";
  if (activityType === "refund") return "Refund";
  if (activityType === "adjustment") return "Adjustment";
  return "Spend";
}

function getActivityTone(activityType: WalletActivity["activityType"]) {
  if (
    activityType === "reward" ||
    activityType === "deposit" ||
    activityType === "receive" ||
    activityType === "refund"
  ) {
    return "text-emerald-600";
  }

  if (activityType === "subscription") {
    return "text-primary";
  }

  return "text-rose-500";
}

function getActivityAmountSigned(activity: WalletActivity) {
  if (
    activity.activityType === "reward" ||
    activity.activityType === "deposit" ||
    activity.activityType === "receive" ||
    activity.activityType === "refund" ||
    activity.activityType === "adjustment"
  ) {
    return activity.tokenAmount;
  }

  return -activity.tokenAmount;
}

function getFlowColor(activityType: WalletActivity["activityType"]) {
  if (activityType === "reward") return "#2563eb";
  if (activityType === "deposit") return "#14b8a6";
  if (activityType === "subscription") return "#f59e0b";
  if (activityType === "send") return "#fb7185";
  if (activityType === "receive") return "#22c55e";
  if (activityType === "withdraw") return "#ef4444";
  if (activityType === "refund") return "#8b5cf6";
  if (activityType === "adjustment") return "#64748b";
  return "#f97316";
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const fetchWalletSummary = useWalletStore(
    (state) => state.fetchWalletSummary,
  );
  const walletTokenBalance = useWalletStore((state) => state.tokenBalance);
  const tokenPerUsdValue = useWalletStore((state) => state.tokenPerUsd);
  const latestPayment = useWalletStore((state) => state.latestPayment);
  const walletStats = useWalletStore((state) => state.stats);
  const [activities, setActivities] = useState<WalletActivity[]>([]);
  const [incomeChartPoints, setIncomeChartPoints] = useState<
    WalletIncomeChartPoint[]
  >([]);
  const [strategyIncomeRangeDays, setStrategyIncomeRangeDays] =
    useState<WalletIncomeChartRange>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [isIncomeChartLoading, setIsIncomeChartLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setIsLoading(true);

      try {
        const [, activityData] = await Promise.all([
          fetchWalletSummary(true),
          getWalletActivity({
            page: 1,
          }),
        ]);

        if (ignore) {
          return;
        }

        setActivities(activityData.activities ?? []);
        setLoadError("");
      } catch (error) {
        if (!ignore) {
          setLoadError(getApiErrorMessage(error, "Failed to load dashboard."));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [fetchWalletSummary]);

  useEffect(() => {
    let ignore = false;

    async function loadIncomeChart() {
      setIsIncomeChartLoading(true);

      try {
        const data = await getWalletIncomeChart({
          days: strategyIncomeRangeDays,
        });

        if (ignore) {
          return;
        }

        setIncomeChartPoints(data.points ?? []);
      } catch (error) {
        if (!ignore) {
          setLoadError(
            getApiErrorMessage(error, "Failed to load income chart."),
          );
        }
      } finally {
        if (!ignore) {
          setIsIncomeChartLoading(false);
        }
      }
    }

    void loadIncomeChart();

    return () => {
      ignore = true;
    };
  }, [strategyIncomeRangeDays]);

  const tokenBalance = walletTokenBalance ?? Number(user?.tokenBalance ?? 0);
  const tokenPerUsd = tokenPerUsdValue;
  const strategyCount = user?.stats?.strategyCount ?? 0;
  const followerCount = user?.stats?.followerCount ?? 0;
  const backtestCount = user?.stats?.backtestCount ?? 0;

  const rewardActivities = useMemo(
    () => activities.filter((activity) => activity.activityType === "reward"),
    [activities],
  );

  const strategyIncomeTotal = rewardActivities.reduce(
    (sum, activity) => sum + activity.tokenAmount,
    0,
  );
  const depositTotal = activities
    .filter((activity) => activity.activityType === "deposit")
    .reduce((sum, activity) => sum + activity.tokenAmount, 0);
  const subscriptionSpendTotal = activities
    .filter((activity) => activity.activityType === "subscription")
    .reduce((sum, activity) => sum + activity.tokenAmount, 0);
  const netFlowTotal = activities.reduce(
    (sum, activity) => sum + getActivityAmountSigned(activity),
    0,
  );

  const incomeChartData = useMemo(() => {
    return incomeChartPoints.map((point) => {
      const date = new Date(`${point.key}T00:00:00.000Z`);

      return {
        ...point,
        label: Number.isNaN(date.getTime())
          ? point.key
          : dashboardDateFormatter.format(date),
      };
    });
  }, [incomeChartPoints]);

  const flowChartData = useMemo(() => {
    const activityTypes: WalletActivity["activityType"][] = [
      "reward",
      "deposit",
      "subscription",
      "send",
      "receive",
      "spend",
    ];

    return activityTypes.map((activityType) => {
      const amount = activities
        .filter((activity) => activity.activityType === activityType)
        .reduce((sum, activity) => sum + activity.tokenAmount, 0);

      return {
        label: getActivityLabel(activityType),
        amount,
        fill: getFlowColor(activityType),
      };
    });
  }, [activities]);

  const recentRewardHighlights = rewardActivities.slice(0, 4);
  const recentActivity = activities.slice(0, 6);
  const lifetimeRewardEarned =
    walletStats?.totalRewardEarned ?? strategyIncomeTotal;
  const lifetimeDeposited = walletStats?.totalDeposited ?? depositTotal;
  const lifetimeSubscriptionSpent =
    walletStats?.totalSubscriptionSpent ?? subscriptionSpendTotal;

  const topRewardSource = useMemo(() => {
    const sourceMap = new Map<string, number>();

    rewardActivities.forEach((activity) => {
      const source = activity.metadata?.strategyName?.trim()
        ? activity.metadata.strategyName.trim()
        : activity.metadata?.rewardSource?.trim()
          ? activity.metadata.rewardSource.trim()
          : "Creator reward";

      sourceMap.set(
        source,
        (sourceMap.get(source) ?? 0) + activity.tokenAmount,
      );
    });

    const [topSource] = Array.from(sourceMap.entries()).sort(
      (left, right) => right[1] - left[1],
    );

    return topSource
      ? {
          label: topSource[0],
          amount: topSource[1],
        }
      : null;
  }, [rewardActivities]);

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden pb-10 md:space-y-6">
      <Card className="rounded-lg border-0 shadow-none">
        <CardContent className="grid gap-6 py-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="space-y-5">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                Creator Dashboard
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {getGreeting()}
                {user?.name ? `, ${user.name}` : ""}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Monitor earnings, wallet balance, and recent activity at a
                glance.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/30 p-4">
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Token balance
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {formatCompactTokenAmount(tokenBalance)} token
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {typeof tokenPerUsd === "number" && tokenPerUsd > 0
                    ? `~ ${formatUsd(tokenBalance / tokenPerUsd)} USD`
                    : "USD estimate unavailable"}
                </p>
              </div>

              <div className="rounded-xl bg-muted/30 p-4">
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Total rewards
                </p>
                <p
                  className={cn(
                    "mt-2 text-2xl font-semibold tracking-tight",
                    lifetimeRewardEarned > 0 ? "text-emerald-600" : undefined,
                  )}
                >
                  {lifetimeRewardEarned > 0 ? "+" : ""}
                  {formatCompactTokenAmount(lifetimeRewardEarned)} token
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  All creator rewards earned
                </p>
              </div>

              <div className="rounded-xl bg-muted/30 p-4">
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Strategies live
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {strategyCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {backtestCount} backtests tracked
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="min-w-32 justify-center">
                <Link to="/strategy">
                  <BriefcaseBusiness className="size-4" />
                  Open Strategy
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-w-32 justify-center"
              >
                <Link to="/wallet">
                  <Wallet className="size-4" />
                  Open Wallet
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    Creator momentum
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight">
                    {followerCount} followers
                  </p>
                </div>
                <span className="inline-flex size-9 items-center justify-center rounded-full border bg-muted/40 text-primary">
                  <Users className="size-4" />
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Net token flow</span>
                  <span
                    className={cn(
                      "font-medium",
                      netFlowTotal >= 0 ? "text-emerald-600" : "text-rose-500",
                    )}
                  >
                    {netFlowTotal >= 0 ? "+" : ""}
                    {formatCompactTokenAmount(netFlowTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Latest deposit</span>
                  <span className="font-medium capitalize">
                    {latestPayment?.status || "No deposit yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Best reward source
                  </span>
                  <span className="max-w-40 truncate font-medium">
                    {topRewardSource?.label || "No rewards yet"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Useful snapshot
              </p>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    01
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">Earnings</p>
                    <p className="text-sm text-muted-foreground">
                      {lifetimeRewardEarned > 0
                        ? `${formatToken(lifetimeRewardEarned)} earned from all strategy reward activity.`
                        : "No strategy income yet. Publish or promote a strategy to start earning."}
                    </p>
                  </div>
                </div>
                <div className="ml-4 h-6 w-px bg-border" />
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    02
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">Funding</p>
                    <p className="text-sm text-muted-foreground">
                      {lifetimeDeposited > 0
                        ? `${formatToken(lifetimeDeposited)} added through confirmed deposits.`
                        : "No recent deposit detected. Top up your wallet when you need more token."}
                    </p>
                  </div>
                </div>
                <div className="ml-4 h-6 w-px bg-border" />
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    03
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">Subscriptions</p>
                    <p className="text-sm text-muted-foreground">
                      {lifetimeSubscriptionSpent > 0
                        ? `${formatToken(lifetimeSubscriptionSpent)} spent on subscriptions so far.`
                        : "No recent subscription spending found."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
            <ArrowDownLeft className="size-4" />
            {loadError}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Strategy Income</CardTitle>
                <CardDescription>
                  Recent earned token from creator reward activity.
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-between gap-2 sm:min-w-36"
                  >
                    <span>
                      {
                        STRATEGY_INCOME_RANGE_OPTIONS.find(
                          (option) => option.value === strategyIncomeRangeDays,
                        )?.label
                      }
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-32">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Range
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={String(strategyIncomeRangeDays)}
                    onValueChange={(value) =>
                      setStrategyIncomeRangeDays(Number(value) as 7 | 30 | 90)
                    }
                  >
                    {STRATEGY_INCOME_RANGE_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={String(option.value)}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {isIncomeChartLoading ? (
              <div className="flex h-72 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : (
              <ChartContainer
                config={incomeChartConfig}
                className="h-72 w-full"
              >
                <AreaChart
                  data={incomeChartData}
                  margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashboardIncomeFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-earned)"
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="70%"
                        stopColor="var(--color-earned)"
                        stopOpacity={0.08}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-earned)"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, _name, _item, _index, payload) => {
                          const point = payload as { label?: string };

                          return (
                            <div className="flex min-w-0 items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                {point.label || "Income"}
                              </span>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                {typeof value === "number"
                                  ? formatCompactTokenAmount(value)
                                  : value}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="earned"
                    stroke="var(--color-earned)"
                    fill="url(#dashboardIncomeFill)"
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: "var(--color-earned)",
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 4,
                      fill: "var(--color-earned)",
                      stroke: "var(--color-background)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Token Flow Mix</CardTitle>
            <CardDescription>
              How recent wallet activity is distributed by type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex h-72 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : (
              <>
                <ChartContainer
                  config={flowChartConfig}
                  className="h-64 w-full"
                >
                  <BarChart
                    data={flowChartData}
                    margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={54}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, _name, _item, _index, payload) => {
                            const point = payload as { label?: string };

                            return (
                              <div className="flex min-w-0 items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                  {point.label || "Activity"}
                                </span>
                                <span className="font-mono font-medium text-foreground tabular-nums">
                                  {typeof value === "number"
                                    ? formatCompactTokenAmount(value)
                                    : value}
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {flowChartData.map((entry) => (
                        <Cell key={entry.label} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="grid gap-2">
                  {flowChartData.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border bg-card px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex size-2.5 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCompactTokenAmount(item.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Jump into the places you use most.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link
              to="/wallet"
              className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-full border bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </div>
              <p className="mt-4 font-medium">Manage wallet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review transfers, receipts, deposits, and wallet balance.
              </p>
            </Link>

            <Link
              to="/strategy"
              className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-full border bg-primary/10 text-primary">
                <BriefcaseBusiness className="size-4" />
              </div>
              <p className="mt-4 font-medium">Open strategies</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Publish, refine, or review the strategies tied to your creator
                income.
              </p>
            </Link>

            <Link
              to="/backtest"
              className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-full border bg-primary/10 text-primary">
                <CandlestickChart className="size-4" />
              </div>
              <p className="mt-4 font-medium">Open backtests</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Launch, review, and refine your backtest runs from one place.
              </p>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Recent Wallet Activity</CardTitle>
            <CardDescription>
              Latest movement across creator income and wallet actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex h-56 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : recentActivity.length ? (
              recentActivity.map((activity) => (
                <div
                  key={activity._id}
                  className="flex items-center justify-between gap-3 rounded-lg px-1 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-full border bg-muted/40 text-primary">
                      {getActivityAmountSigned(activity) >= 0 ? (
                        <ArrowDownLeft className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {getActivityLabel(activity.activityType)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activity.description || "Wallet activity"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-medium",
                        getActivityTone(activity.activityType),
                      )}
                    >
                      {getActivityAmountSigned(activity) >= 0 ? "+" : ""}
                      {formatCompactTokenAmount(
                        getActivityAmountSigned(activity),
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dashboardDateFormatter.format(
                        new Date(activity.createdAt),
                      )}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                No wallet activity yet. Your recent rewards, deposits, and
                transfers will show up here.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 shadow-none">
          <CardHeader>
            <CardTitle>Income Highlights</CardTitle>
            <CardDescription>
              Recent strategy reward moments worth noticing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex h-56 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : recentRewardHighlights.length ? (
              recentRewardHighlights.map((activity) => (
                <div
                  key={activity._id}
                  className="space-y-2 rounded-lg px-1 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-medium">
                      {activity.metadata?.strategyName || "Creator reward"}
                    </p>
                    <span className="text-sm font-medium text-emerald-600">
                      +{formatCompactTokenAmount(activity.tokenAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">
                      {activity.metadata?.viewerUsername
                        ? `Viewer @${activity.metadata.viewerUsername}`
                        : activity.metadata?.rewardSource || "Reward"}
                    </span>
                    <span>
                      {dashboardDateFormatter.format(
                        new Date(activity.createdAt),
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                No strategy income yet. Earnings from paid strategy views will
                appear here once they start landing.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
