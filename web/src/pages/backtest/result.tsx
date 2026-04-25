import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Bookmark,
  BookmarkCheck,
  AreaChart,
  ChevronLeft,
  ChevronDown,
  CalendarClock,
  CandlestickChart,
  CircleDollarSign,
  Clock3,
  Copy,
  Eye,
  Globe,
  Lock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Percent,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  SquareArrowOutUpRight,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createFollow, deleteFollow } from "@/api/follow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getUserAvatarRingClass,
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
import { useBookmarkIds } from "@/hooks/use-bookmark-ids";
import { cn } from "@/lib/utils";
import { deleteBacktest, fetchBacktestById } from "@/api/backtest";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

type EquityPoint = {
  timestamp: number;
  equity: number;
};

type Trade = {
  side: "buy" | "sell" | string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  exitReason: "stopLoss" | "takeProfit" | string;
};

type BacktestResult = {
  duration: number;
  initialBalance: number;
  finalBalance: number;
  totalPnL: number;
  roi: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  payoffRatio?: number;
  grossProfit: number;
  grossLoss: number;
  averageWin: number;
  averageLoss: number;
  expectancy?: number;
  averageTradeDuration?: number;
  longestTradeDuration?: number;
  shortestTradeDuration?: number;
  maxWin: number;
  maxLoss: number;
  maxWinStreak: number;
  maxLossStreak: number;
  streakInsight?: string;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  recoveryFactor?: number;
  totalFees: number;
  averageTradeFee: number;
  averageTradePnL: number;
  equityCurves: EquityPoint[];
  trades: Trade[];
};

type BacktestDetail = {
  _id: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  hedgeMode: boolean;
  amountPerTrade: number;
  entryFeeRate: number;
  exitFeeRate: number;
  strategy?: {
    _id?: string;
    name?: string;
    description?: string;
    isPublic?: boolean;
    stats?: {
      viewCount?: number;
      bookmarkCount?: number;
    };
    user?: {
      _id?: string;
      name?: string;
      username?: string;
      avatar?: string;
      membership?: UserMembership;
    };
  };
  user?: {
    _id?: string;
    name?: string;
    username?: string;
    avatar?: string;
    membership?: UserMembership;
    isFollowing?: boolean;
    stats?: {
      followerCount?: number;
      strategyCount?: number;
      backtestCount?: number;
    };
  };
  result: BacktestResult;
};

let backtestBookmarkLoadPromise: Promise<void> | null = null;

async function loadBacktestBookmarksOnce(
  loadBacktestBookmarks: () => Promise<void>,
) {
  if (backtestBookmarkLoadPromise) return backtestBookmarkLoadPromise;

  backtestBookmarkLoadPromise = loadBacktestBookmarks().finally(() => {
    backtestBookmarkLoadPromise = null;
  });

  return backtestBookmarkLoadPromise;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const moneyFixed = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function formatDuration(durationMs?: number) {
  if (!Number.isFinite(durationMs) || !durationMs || durationMs <= 0) {
    return "-";
  }

  const totalMinutes = Math.floor(durationMs / 60000);
  const totalHours = Math.floor(durationMs / 3600000);
  const totalDays = Math.floor(durationMs / 86400000);

  if (totalDays >= 1) {
    return `${totalDays}d`;
  }

  if (totalHours >= 1) {
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
  }

  return `${Math.max(1, totalMinutes)}m`;
}

function formatDateRangeDuration(totalDays: number) {
  if (totalDays <= 0) {
    return "-";
  }

  if (totalDays === 1) return "1 day";
  if (totalDays === 7) return "1 week";
  if (totalDays === 30) return "1 month";
  if (totalDays === 182 || totalDays === 183) return "6 months";
  if (totalDays === 365 || totalDays === 366) return "1 year";

  return `${totalDays} days`;
}

function getUtcMonthLabel(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

function getUtcHourLabel(timestamp: number) {
  return `${new Date(timestamp).getUTCHours().toString().padStart(2, "0")}:00`;
}

function getUtcDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getTopBucket(entries: Trade[], getKey: (trade: Trade) => string) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const key = getKey(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let topKey = "-";
  let topCount = 0;

  for (const [key, count] of counts.entries()) {
    if (count > topCount) {
      topKey = key;
      topCount = count;
    }
  }

  return { key: topKey, count: topCount, size: counts.size };
}

type RadarView = "edge" | "execution" | "timing";
type TradeActivityView = "date" | "hour" | "month";

const radarViewOptions: Array<{
  value: RadarView;
  label: string;
  description: string;
}> = [
  {
    value: "edge",
    label: "Edge",
    description: "Win quality, payoff, recovery, and drawdown control.",
  },
  {
    value: "execution",
    label: "Execution",
    description: "Trade frequency, fee load, and average trade output.",
  },
  {
    value: "timing",
    label: "Activity",
    description: "When trades cluster by month, hour, and trading date.",
  },
];

const tradeActivityViewOptions: Array<{
  value: TradeActivityView;
  label: string;
  description: string;
}> = [
  {
    value: "hour",
    label: "Hour",
    description: "Busiest trade entry hours in UTC.",
  },
  {
    value: "date",
    label: "Date",
    description: "Most active trading dates in UTC.",
  },
  {
    value: "month",
    label: "Month",
    description: "Monthly trade distribution in UTC.",
  },
];

function EquityCurve({
  data,
  initialBalance,
  finalBalance,
}: {
  data: EquityPoint[];
  initialBalance: number;
  finalBalance: number;
}) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        timestamp: item.timestamp,
        equity: Number(item.equity.toFixed(2)),
      })),
    [data],
  );

  if (chartData.length < 2) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No equity curve data available.
      </div>
    );
  }

  const startEquity = initialBalance;
  const endEquity = finalBalance;
  const returnPercent =
    startEquity > 0 ? ((endEquity - startEquity) / startEquity) * 100 : 0;
  const isProfit = endEquity >= startEquity;
  const returnPrefix = returnPercent >= 0 ? "+" : "";

  const chartConfig = {
    equity: {
      label: "Equity",
      color: isProfit ? "var(--color-success)" : "var(--color-destructive)",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Equity Trend
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-md border px-2 py-1 text-xs font-medium",
            isProfit
              ? "border-success/25 bg-success/10 text-success"
              : "border-destructive/25 bg-destructive/10 text-destructive",
          )}
        >
          ROI {returnPrefix}
          {ratio.format(returnPercent)}%
        </span>
      </div>

      <ChartContainer config={chartConfig} className="h-64 w-full md:h-80">
        <RechartsAreaChart
          data={chartData}
          margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fillEquityResult" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-equity)"
                stopOpacity={0.28}
              />
              <stop
                offset="70%"
                stopColor="var(--color-equity)"
                stopOpacity={0.08}
              />
              <stop
                offset="95%"
                stopColor="var(--color-equity)"
                stopOpacity={0.01}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="color-mix(in oklab, var(--color-border) 82%, transparent)"
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, _item, _index, payload) => {
                  const point = payload as { timestamp?: number };
                  const equityValue =
                    typeof value === "number" ? value : Number(value);
                  const equityPercent =
                    Number.isFinite(equityValue) && initialBalance > 0
                      ? ((equityValue - initialBalance) / initialBalance) * 100
                      : 0;

                  return (
                    <>
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {point.timestamp
                            ? format(new Date(point.timestamp), "MMM d, yyyy")
                            : "Equity"}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {Number.isFinite(equityValue)
                            ? moneyFixed.format(equityValue)
                            : value}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <span className="text-muted-foreground">Change</span>
                        <span
                          className={cn(
                            "font-mono font-medium tabular-nums",
                            equityPercent >= 0
                              ? "text-success"
                              : "text-destructive",
                          )}
                        >
                          {equityPercent >= 0 ? "+" : ""}
                          {ratio.format(equityPercent)}%
                        </span>
                      </div>
                    </>
                  );
                }}
              />
            }
          />
          <XAxis
            dataKey="timestamp"
            minTickGap={32}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => format(new Date(value), "MMM d")}
          />
          <Area
            dataKey="equity"
            type="monotone"
            stroke="var(--color-equity)"
            fill="url(#fillEquityResult)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-equity)",
              stroke: "var(--color-background)",
              strokeWidth: 2,
            }}
          />
        </RechartsAreaChart>
      </ChartContainer>
    </div>
  );
}

function TradeDistributionChart({
  wins,
  losses,
}: {
  wins: number;
  losses: number;
}) {
  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const chartData = [
    { name: "wins", value: wins, fill: "var(--color-wins)" },
    { name: "losses", value: losses, fill: "var(--color-losses)" },
  ];

  const chartConfig = {
    wins: {
      label: "Wins",
      color: "var(--color-success)",
    },
    losses: {
      label: "Losses",
      color: "var(--color-destructive)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="mx-auto h-64 max-w-[320px]">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => (
                <>
                  <span className="text-muted-foreground">
                    {name === "wins" ? "Wins" : "Losses"}
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {value}
                  </span>
                </>
              )}
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={88}
          strokeWidth={5}
          labelLine={false}
          label={({ cx, cy, midAngle, outerRadius, percent, value, name }) => {
            if (
              typeof cx !== "number" ||
              typeof cy !== "number" ||
              typeof outerRadius !== "number" ||
              typeof midAngle !== "number" ||
              typeof percent !== "number" ||
              typeof value !== "number" ||
              !value
            ) {
              return null;
            }

            const radius = outerRadius + 18;
            const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
            const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
            const isRightSide = x >= cx;

            return (
              <text
                x={x}
                y={y}
                textAnchor={isRightSide ? "start" : "end"}
                dominantBaseline="central"
              >
                <tspan className="fill-foreground text-[11px] font-medium">
                  {name === "wins" ? "Wins" : "Losses"}: {value}
                </tspan>
                <tspan dx={4} className="fill-muted-foreground text-[10px]">
                  ({ratio.format(percent * 100)}%)
                </tspan>
              </text>
            );
          }}
        >
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                return null;
              }

              return (
                <text
                  x={viewBox.cx}
                  y={viewBox.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <tspan
                    x={viewBox.cx}
                    y={viewBox.cy}
                    className="fill-foreground text-2xl font-semibold"
                  >
                    {totalTrades}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy || 0) + 20}
                    className="fill-muted-foreground text-[11px]"
                  >
                    trades
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy || 0) + 38}
                    className="fill-muted-foreground text-[10px]"
                  >
                    Win rate {ratio.format(winRate)}%
                  </tspan>
                </text>
              );
            }}
          />
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function TradeActivityBarChart({ trades }: { trades: Trade[] }) {
  const [view, setView] = useState<TradeActivityView>("hour");
  const [hourLabelMode, setHourLabelMode] = useState<
    "mobile" | "tablet" | "desktop"
  >("mobile");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const tabletQuery = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mediaQuery.matches) {
        setHourLabelMode("desktop");
        return;
      }

      if (tabletQuery.matches) {
        setHourLabelMode("tablet");
        return;
      }

      setHourLabelMode("mobile");
    };

    onChange();
    mediaQuery.addEventListener("change", onChange);
    tabletQuery.addEventListener("change", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
      tabletQuery.removeEventListener("change", onChange);
    };
  }, []);

  const chartData = useMemo(() => {
    if (view === "hour") {
      const counts = new Map<string, number>();

      for (let hour = 0; hour < 24; hour += 1) {
        counts.set(`${hour.toString().padStart(2, "0")}:00`, 0);
      }

      for (const trade of trades) {
        const key = getUtcHourLabel(trade.entryTime);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return Array.from(counts.entries()).map(([label, tradesCount]) => ({
        label,
        trades: tradesCount,
      }));
    }

    if (view === "month") {
      const monthOrder = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const counts = new Map<string, number>();

      for (const month of monthOrder) {
        counts.set(month, 0);
      }

      for (const trade of trades) {
        const key = getUtcMonthLabel(trade.entryTime);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return monthOrder.map((label) => ({
        label,
        trades: counts.get(label) ?? 0,
      }));
    }

    const counts = new Map<string, number>();

    for (const trade of trades) {
      const key = getUtcDateKey(trade.entryTime);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, tradesCount]) => ({
        label,
        trades: tradesCount,
      }));
  }, [trades, view]);

  const chartConfig = {
    trades: {
      label: "Trades",
      color: "var(--color-primary)",
    },
  } satisfies ChartConfig;

  const activeView =
    tradeActivityViewOptions.find((option) => option.value === view) ??
    tradeActivityViewOptions[0];

  if (!chartData.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No trade activity data available.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {activeView.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {tradeActivityViewOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={view === option.value ? "default" : "outline"}
              className="rounded-full px-4"
              onClick={() => setView(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-72 w-full">
        <RechartsBarChart
          data={chartData}
          margin={{ left: 4, right: 4, top: 12, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="color-mix(in oklab, var(--color-border) 82%, transparent)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval={0}
            minTickGap={12}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value, index) => {
              if (view === "hour") {
                if (hourLabelMode === "desktop") {
                  return String(value);
                }

                if (hourLabelMode === "tablet") {
                  return index % 2 === 0 ? String(value) : "";
                }

                return index % 3 === 0 ? String(value) : "";
              }

              return String(value);
            }}
            angle={view === "date" ? -25 : 0}
            textAnchor={view === "date" ? "end" : "middle"}
            height={view === "date" ? 56 : 30}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={28}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, _item, _index, payload) => {
                  const point = payload as { label?: string };

                  return (
                    <>
                      <span className="text-muted-foreground">
                        {point.label ?? activeView.label}
                      </span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {value} trades
                      </span>
                    </>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="trades"
            radius={[8, 8, 0, 0]}
            fill="var(--color-trades)"
          />
        </RechartsBarChart>
      </ChartContainer>
    </div>
  );
}

function PerformanceRadarChart({
  view,
  winRate,
  payoffRatio,
  profitFactor,
  recoveryFactor,
  maxDrawdownPercent,
  totalTrades,
  averageTradePnL,
  totalFees,
  trades,
}: {
  view: RadarView;
  winRate: number;
  payoffRatio?: number;
  profitFactor: number;
  recoveryFactor?: number;
  maxDrawdownPercent: number;
  totalTrades: number;
  averageTradePnL: number;
  totalFees: number;
  trades: Trade[];
}) {
  const scoreRatio = (value: number, multiplier: number) =>
    Math.max(0, Math.min(100, value * multiplier));
  const scorePercent = (value: number) => Math.max(0, Math.min(100, value));
  const scoreInversePercent = (value: number, multiplier: number) =>
    Math.max(0, Math.min(100, 100 - Math.abs(value) * multiplier));
  const scoreCount = (value: number, target: number) =>
    Math.max(0, Math.min(100, (value / target) * 100));
  const scoreCurrency = (value: number, target: number) =>
    Math.max(0, Math.min(100, (Math.abs(value) / target) * 100));
  const monthActivity = getTopBucket(trades, (trade) =>
    getUtcMonthLabel(trade.entryTime),
  );
  const hourActivity = getTopBucket(trades, (trade) =>
    getUtcHourLabel(trade.entryTime),
  );
  const dateActivity = getTopBucket(trades, (trade) =>
    getUtcDateKey(trade.entryTime),
  );
  const uniqueTradeDates = new Set(
    trades.map((trade) => getUtcDateKey(trade.entryTime)),
  ).size;

  const chartData =
    view === "execution"
      ? [
          {
            metric: "Trades",
            value: scoreCount(totalTrades, 100),
            raw: String(totalTrades),
          },
          {
            metric: "Win Rate",
            value: scorePercent(winRate),
            raw: `${ratio.format(winRate)}%`,
          },
          {
            metric: "Avg PnL",
            value: scoreCurrency(averageTradePnL, 100),
            raw: money.format(averageTradePnL),
          },
          {
            metric: "Avg Fee",
            value: scoreCurrency(
              totalTrades > 0 ? totalFees / totalTrades : 0,
              20,
            ),
            raw: moneyFixed.format(
              totalTrades > 0 ? totalFees / totalTrades : 0,
            ),
          },
          {
            metric: "Profit",
            value: scoreRatio(profitFactor, 50),
            raw: ratio.format(profitFactor),
          },
        ]
      : view === "timing"
        ? [
            {
              metric: "Top Month",
              value:
                totalTrades > 0 ? (monthActivity.count / totalTrades) * 100 : 0,
              raw:
                monthActivity.count > 0
                  ? `${monthActivity.key} (${monthActivity.count})`
                  : "-",
            },
            {
              metric: "Peak Hour",
              value:
                totalTrades > 0 ? (hourActivity.count / totalTrades) * 100 : 0,
              raw:
                hourActivity.count > 0
                  ? `${hourActivity.key} UTC (${hourActivity.count})`
                  : "-",
            },
            {
              metric: "Top Date",
              value:
                totalTrades > 0 ? (dateActivity.count / totalTrades) * 100 : 0,
              raw:
                dateActivity.count > 0
                  ? `${dateActivity.key} (${dateActivity.count})`
                  : "-",
            },
            {
              metric: "Active Days",
              value: scoreCount(uniqueTradeDates, 31),
              raw: String(uniqueTradeDates),
            },
            {
              metric: "Active Months",
              value: scoreCount(monthActivity.size, 12),
              raw: String(monthActivity.size),
            },
          ]
        : [
            {
              metric: "Win Rate",
              value: scorePercent(winRate),
              raw: `${ratio.format(winRate)}%`,
            },
            {
              metric: "Payoff",
              value: scoreRatio(payoffRatio ?? 0, 50),
              raw: ratio.format(payoffRatio ?? 0),
            },
            {
              metric: "Profit",
              value: scoreRatio(profitFactor, 50),
              raw: ratio.format(profitFactor),
            },
            {
              metric: "Recovery",
              value: scoreRatio(recoveryFactor ?? 0, 25),
              raw: ratio.format(recoveryFactor ?? 0),
            },
            {
              metric: "Drawdown",
              value: scoreInversePercent(maxDrawdownPercent, 500),
              raw: `-${ratio.format(Math.abs(maxDrawdownPercent))}%`,
            },
          ];

  const chartConfig = {
    value: {
      label: "Score",
      color: "var(--color-primary)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="mx-auto h-80 max-w-[420px]">
      <RadarChart data={chartData}>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_, __, ___, ____, payload) => (
                <>
                  <span className="text-muted-foreground">
                    {(payload as { metric?: string }).metric ?? "Metric"}
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {(payload as { raw?: string }).raw ?? "-"}
                  </span>
                </>
              )}
            />
          }
        />
        <PolarGrid />
        <PolarAngleAxis
          dataKey="metric"
          tick={({ payload, x, y, textAnchor, ...props }) => {
            const item = chartData.find(
              (entry) => entry.metric === payload?.value,
            );

            return (
              <text
                x={x}
                y={y}
                textAnchor={textAnchor}
                className="fill-muted-foreground"
                {...props}
              >
                <tspan x={x} dy="0" className="text-[11px] font-medium">
                  {payload?.value}
                </tspan>
                <tspan
                  x={x}
                  dy="14"
                  className="fill-foreground text-[10px] font-medium"
                >
                  {item?.raw ?? "-"}
                </tspan>
              </text>
            );
          }}
        />
        <Radar
          dataKey="value"
          fill="var(--color-value)"
          fillOpacity={0.2}
          stroke="var(--color-value)"
          strokeWidth={2}
        />
      </RadarChart>
    </ChartContainer>
  );
}

export default function BacktestResultPage() {
  const navigate = useNavigate();
  const { backtestId = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const {
    bookmarkedIds: bookmarkedBacktestIds,
    updatingIds: updatingBacktestIds,
    loadBookmarks: loadBacktestBookmarks,
    toggleBookmark: toggleBacktestBookmark,
  } = useBookmarkIds("backtest");
  const {
    bookmarkedIds: bookmarkedStrategyIds,
    updatingIds: updatingStrategyIds,
    loadBookmarks: loadStrategyBookmarks,
    toggleBookmark: toggleStrategyBookmark,
  } = useBookmarkIds("strategy");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [tradesPage, setTradesPage] = useState(1);
  const [radarView, setRadarView] = useState<RadarView>("edge");
  const [backtest, setBacktest] = useState<BacktestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false);
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBacktest = async () => {
      if (!backtestId) {
        if (isMounted) setBacktest(null);
        if (isMounted) setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setBacktest(null);

      try {
        const [response] = await Promise.all([
          fetchBacktestById(backtestId),
          isAuthenticated
            ? Promise.all([
                loadBacktestBookmarksOnce(loadBacktestBookmarks),
                loadStrategyBookmarks(),
              ])
            : Promise.resolve(),
        ]);

        if (!isMounted) return;
        setBacktest(response?.result?.backtest ?? null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadBacktest();

    return () => {
      isMounted = false;
    };
  }, [
    backtestId,
    isAuthenticated,
    loadBacktestBookmarks,
    loadStrategyBookmarks,
  ]);

  if (!backtestId) {
    return <Navigate to="/backtest" replace />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex min-h-[160px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading backtest result...
          </div>
        </div>
      </div>
    );
  }

  if (!backtest?.result) {
    return <Navigate to="/backtest" replace />;
  }

  const result = backtest.result;
  const dateWindowDurationLabel = formatDateRangeDuration(
    Math.max(1, Math.ceil(result.duration / 86400000)),
  );
  const pnlPositive = result.totalPnL >= 0;
  const averageTradeFee = Number.isFinite(result.averageTradeFee)
    ? result.averageTradeFee
    : 0;
  const activeRadarView =
    radarViewOptions.find((option) => option.value === radarView) ??
    radarViewOptions[0];
  const strategyName = backtest.strategy?.name?.trim() || "Strategy";
  const strategyIsPublic = backtest.strategy?.isPublic ?? false;
  const strategyCreatorUsername =
    backtest.strategy?.user?.username?.trim().replace(/^@/, "") || "unknown";
  const backtesterName =
    backtest.user?.name?.trim() || backtest.user?.username || "Unknown";
  const backtesterUsername =
    backtest.user?.username?.trim().replace(/^@/, "") || "unknown";
  const isBacktestOwner =
    Boolean(user?._id) && backtest.user?._id === user?._id;
  const isFollowingBacktester = Boolean(backtest.user?.isFollowing);
  const isBacktestBookmarked = bookmarkedBacktestIds.has(backtestId);
  const isBacktestBookmarkUpdating = updatingBacktestIds.has(backtestId);
  const isStrategyOwner =
    Boolean(user?._id) && backtest.strategy?.user?._id === user?._id;
  const isStrategyBookmarked = Boolean(
    backtest.strategy?._id && bookmarkedStrategyIds.has(backtest.strategy._id),
  );
  const isStrategyBookmarkUpdating = Boolean(
    backtest.strategy?._id && updatingStrategyIds.has(backtest.strategy._id),
  );
  const canOpenCreatorProfile =
    !isStrategyOwner && strategyCreatorUsername !== "unknown";
  const canOpenBacktesterProfile =
    !isBacktestOwner && backtesterUsername !== "unknown";
  const canOpenStrategy =
    Boolean(backtest.strategy?._id) && (strategyIsPublic || isStrategyOwner);
  const tradesPerPage = 10;
  const totalTradesPages = Math.max(
    1,
    Math.ceil(result.trades.length / tradesPerPage),
  );
  const recentTrades = result.trades.slice(
    (tradesPage - 1) * tradesPerPage,
    tradesPage * tradesPerPage,
  );
  const tradePageItems = (() => {
    if (totalTradesPages <= 7) {
      return Array.from({ length: totalTradesPages }, (_, index) => index + 1);
    }

    const items: Array<number | "left-ellipsis" | "right-ellipsis"> = [1];
    const start = Math.max(2, tradesPage - 1);
    const end = Math.min(totalTradesPages - 1, tradesPage + 1);

    if (start > 2) items.push("left-ellipsis");
    for (let page = start; page <= end; page += 1) items.push(page);
    if (end < totalTradesPages - 1) items.push("right-ellipsis");
    items.push(totalTradesPages);
    return items;
  })();

  const onDeleteBacktest = async () => {
    setIsDeleting(true);

    try {
      const promise = deleteBacktest(backtestId);

      // Keep the result page responsive while the delete completes.
      await promise;
      navigate("/leaderboard", { replace: true });
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const onCopyResultLink = async () => {
    const resultUrl = `${window.location.origin}/backtest/${backtestId}`;

    try {
      await navigator.clipboard.writeText(resultUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const onToggleBacktestBookmark = async () => {
    const result = await toggleBacktestBookmark(backtestId);
    if (!result) {
      return;
    }

    if (result.status === "success") {
      toast.success(result.message);
      return;
    }

    toast.error(result.message);
  };

  const onToggleStrategyBookmark = async () => {
    if (!backtest.strategy?._id) {
      return;
    }

    const result = await toggleStrategyBookmark(backtest.strategy._id);
    if (!result) {
      return;
    }

    if (result.status === "success") {
      toast.success(result.message);
      return;
    }

    toast.error(result.message);
  };

  const onCopyBacktesterProfileLink = async () => {
    if (!canOpenBacktesterProfile) return;

    const profileUrl = `${window.location.origin}/${backtesterUsername}`;

    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const onToggleBacktesterFollow = async () => {
    const backtesterId = backtest.user?._id;

    if (!backtesterId || !isAuthenticated || isBacktestOwner) {
      return;
    }

    setIsFollowUpdating(true);

    try {
      if (isFollowingBacktester) {
        await deleteFollow(backtesterId);
      } else {
        await createFollow(backtesterId);
      }

      setBacktest((current) =>
        current?.user
          ? {
              ...current,
              user: {
                ...current.user,
                isFollowing: !isFollowingBacktester,
                stats: {
                  ...current.user.stats,
                  followerCount: Math.max(
                    0,
                    (current.user.stats?.followerCount ?? 0) +
                      (isFollowingBacktester ? -1 : 1),
                  ),
                },
              },
            }
          : current,
      );
    } catch {
      toast.error("Failed to update follow status.");
    } finally {
      setIsFollowUpdating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden md:space-y-6">
      <Card className="min-w-0 border-border/70 text-sm">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                className="w-fit px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                    return;
                  }

                  navigate("/backtest");
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </span>
              </Button>

              <ButtonGroup className="shrink-0">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-r-none border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-background/60 hover:text-foreground"
                  aria-label={isBacktestBookmarked ? "Bookmarked" : "Bookmark"}
                  title={isBacktestBookmarked ? "Bookmarked" : "Bookmark"}
                  disabled={isBacktestBookmarkUpdating}
                  onClick={() => {
                    void onToggleBacktestBookmark();
                  }}
                >
                  {isBacktestBookmarkUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isBacktestBookmarked ? (
                    <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Bookmark className="h-3.5 w-3.5" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="-ml-px rounded-l-none border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-background/60 hover:text-foreground"
                      aria-label="More actions"
                      title="More actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 min-w-44">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() => {
                        void onCopyResultLink();
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        void onToggleBacktestBookmark();
                      }}
                      disabled={isBacktestBookmarkUpdating}
                    >
                      {isBacktestBookmarked ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {isBacktestBookmarked ? "Bookmarked" : "Bookmark"}
                    </DropdownMenuItem>
                    {isBacktestOwner ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            to={`/backtest/${backtestId}/edit`}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setIsDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  Backtest Result
                </span>
              </div>
              <CardTitle>{backtest.symbol} backtest result</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Review the full result with performance metrics, equity
                movement, and detailed trade history.
              </CardDescription>
              <div className="pt-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    <span>{backtest.timeframe}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5">
                    <Clock3 className="h-3.5 w-3.5 text-primary" />
                    <span>{dateWindowDurationLabel}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5">
                    <UserRound className="h-3.5 w-3.5 text-primary" />@
                    <span className="inline-flex items-center gap-1">
                      <span>{backtest.user?.username || "unknown"}</span>
                      <UserMembershipMark
                        membership={backtest.user?.membership}
                        className="size-3"
                      />
                    </span>
                  </span>
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <span className="max-w-[170px] truncate">
                      {backtest.strategy?.name || "Strategy"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteConfirmOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backtest permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The saved backtest result will be
              removed immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="relative !bg-destructive !text-white hover:!bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void onDeleteBacktest();
              }}
            >
              {isDeleting ? (
                <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
              ) : null}
              <span className={isDeleting ? "opacity-0" : undefined}>
                Delete
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="overview" className="min-w-0">
        <div className="overflow-x-auto py-1">
          <TabsList
            variant="line"
            className="w-full min-w-max justify-start md:w-auto"
            aria-label="Backtest result sections"
          >
            <TabsTrigger
              value="overview"
              aria-label="Overview"
              title="Overview"
              className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="hidden group-data-[state=active]:inline md:inline">
                Overview
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              aria-label="Performance"
              title="Performance"
              className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="hidden group-data-[state=active]:inline md:inline">
                Performance
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="setup"
              aria-label="Setup"
              title="Setup"
              className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="hidden group-data-[state=active]:inline md:inline">
                Setup
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="equity"
              aria-label="Equity Curve"
              title="Equity Curve"
              className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
            >
              <AreaChart className="h-4 w-4 shrink-0" />
              <span className="hidden group-data-[state=active]:inline md:inline">
                Equity Curve
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="trades"
              aria-label="Trades"
              title="Trades"
              className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
            >
              <CandlestickChart className="h-4 w-4 shrink-0" />
              <span className="hidden group-data-[state=active]:inline md:inline">
                Trades
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <Card className="min-w-0 overflow-hidden border-border/70 bg-transparent">
            <CardContent className="space-y-4">
              <div className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Backtested By
              </div>

              <div className="space-y-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 md:flex-1 md:gap-6">
                    <Avatar
                      className={cn(
                        "h-10 w-10 md:h-12 md:w-12",
                        getUserAvatarRingClass(backtest.user?.membership),
                      )}
                    >
                      <AvatarImage
                        src={backtest.user?.avatar}
                        alt={backtesterName}
                      />
                      <AvatarFallback>
                        {(backtesterName.trim()?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground md:text-base">
                          {backtesterName}
                        </p>
                        <UserMembershipMark
                          membership={backtest.user?.membership}
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground md:text-sm">
                        @{backtesterUsername}
                      </p>
                    </div>
                    <div className="hidden min-w-0 grid-cols-3 gap-3 text-center md:grid md:max-w-[320px] md:flex-none">
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                          {backtest.user?.stats?.followerCount ?? 0}
                        </p>
                        <p className="break-words text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                          Followers
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                          {backtest.user?.stats?.strategyCount ?? 0}
                        </p>
                        <p className="break-words text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                          Strategies
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                          {backtest.user?.stats?.backtestCount ?? 0}
                        </p>
                        <p className="break-words text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                          Backtests
                        </p>
                      </div>
                    </div>
                  </div>
                  {!isBacktestOwner && canOpenBacktesterProfile ? (
                    <ButtonGroup className="w-auto shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={isFollowingBacktester ? "outline" : "default"}
                        className="relative min-w-0 rounded-r-none px-2.5 md:flex-1"
                        disabled={!isAuthenticated || isFollowUpdating}
                        onClick={() => {
                          if (isFollowingBacktester) {
                            setIsUnfollowDialogOpen(true);
                            return;
                          }

                          void onToggleBacktesterFollow();
                        }}
                      >
                        {isFollowUpdating ? (
                          <Loader2 className="absolute h-4 w-4 animate-spin" />
                        ) : null}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            isFollowUpdating && "opacity-0",
                          )}
                        >
                          {isFollowingBacktester ? (
                            <>
                              <UserCheck className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                Following
                              </span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              <span className="hidden sm:inline">Follow</span>
                            </>
                          )}
                        </span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant={
                              isFollowingBacktester ? "outline" : "default"
                            }
                            className="-ml-px shrink-0 rounded-l-none"
                            aria-label="More backtester actions"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 min-w-44"
                        >
                          <DropdownMenuItem asChild>
                            <Link
                              to={`/${backtesterUsername}`}
                              className="flex items-center gap-2"
                            >
                              <UserRound className="h-4 w-4" />
                              Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              void onCopyBacktesterProfileLink();
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Copy link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => {
                              if (isFollowingBacktester) {
                                setIsUnfollowDialogOpen(true);
                                return;
                              }

                              void onToggleBacktesterFollow();
                            }}
                            disabled={!isAuthenticated || isFollowUpdating}
                          >
                            {isFollowUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isFollowingBacktester ? (
                              <UserCheck className="h-4 w-4" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                            {isFollowingBacktester ? "Unfollow" : "Follow"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ButtonGroup>
                  ) : null}
                </div>
                <div className="grid min-w-0 grid-cols-3 gap-2 text-center md:hidden">
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                      {backtest.user?.stats?.followerCount ?? 0}
                    </p>
                    <p className="break-words text-[10px] tracking-[0.12em] text-muted-foreground uppercase md:text-[11px] md:tracking-[0.14em]">
                      Followers
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                      {backtest.user?.stats?.strategyCount ?? 0}
                    </p>
                    <p className="break-words text-[10px] tracking-[0.12em] text-muted-foreground uppercase md:text-[11px] md:tracking-[0.14em]">
                      Strategies
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                      {backtest.user?.stats?.backtestCount ?? 0}
                    </p>
                    <p className="break-words text-[10px] tracking-[0.12em] text-muted-foreground uppercase md:text-[11px] md:tracking-[0.14em]">
                      Backtests
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <AlertDialog
            open={isUnfollowDialogOpen}
            onOpenChange={setIsUnfollowDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unfollow this user?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can follow this user again anytime from their profile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isFollowUpdating}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isFollowUpdating}
                  className="relative !bg-destructive !text-white hover:!bg-destructive/90"
                  onClick={(event) => {
                    event.preventDefault();
                    void onToggleBacktesterFollow().finally(() => {
                      setIsUnfollowDialogOpen(false);
                    });
                  }}
                >
                  {isFollowUpdating ? (
                    <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
                  ) : null}
                  <span className={isFollowUpdating ? "opacity-0" : undefined}>
                    Unfollow
                  </span>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  ROI
                </CardDescription>
                <CardTitle
                  className={cn(
                    "text-xl md:text-2xl",
                    result.roi >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {result.roi >= 0 ? "+" : ""}
                  {ratio.format(result.roi)}%
                </CardTitle>
              </CardHeader>
              <CardContent
                className={`text-sm ${
                  pnlPositive ? "text-success" : "text-destructive"
                }`}
              >
                <div className="space-y-1.5">
                  <p>{money.format(result.totalPnL)} total PnL</p>
                  <p className="text-muted-foreground">
                    Final balance: {money.format(result.finalBalance)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Win Rate
                </CardDescription>
                <CardTitle>{ratio.format(result.winRate)}%</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <p>
                    {result.wins} wins / {result.losses} losses
                  </p>
                  <p>Total trades: {result.totalTrades}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Max Drawdown
                </CardDescription>
                <CardTitle className="text-destructive">
                  -{ratio.format(Math.abs(result.maxDrawdownPercent))}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <p>{money.format(result.maxDrawdown)}</p>
                  <p>Recovery: {ratio.format(result.recoveryFactor ?? 0)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Profit Factor
                </CardDescription>
                <CardTitle>{ratio.format(result.profitFactor)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <p>Avg trade: {money.format(result.averageTradePnL)}</p>
                  <p>Payoff: {ratio.format(result.payoffRatio ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CandlestickChart className="h-4 w-4 text-primary" />
                Trade Distribution
              </CardTitle>
              <CardDescription>
                Quick read on how your closed trades split between wins and
                losses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TradeDistributionChart
                wins={result.wins}
                losses={result.losses}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 md:space-y-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-2">
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4" />
                  Fees
                </CardDescription>
                <CardTitle>{money.format(result.totalFees)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <p>
                    Entry / Exit Fees: {backtest.entryFeeRate}% /{" "}
                    {backtest.exitFeeRate}%
                  </p>
                  <p>Avg fee / trade: {moneyFixed.format(averageTradeFee)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Win / Loss Streak
                </CardDescription>
                <CardTitle>
                  <span className="text-success">
                    {result.maxWinStreak ?? 0}
                  </span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-destructive">
                    {result.maxLossStreak ?? 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <p>{result.streakInsight || "Streak insight unavailable"}</p>
                  <p>
                    Max win / loss: {money.format(result.maxWin)} /{" "}
                    {money.format(result.maxLoss)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AreaChart className="h-4 w-4 text-primary" />
                Performance Insights
              </CardTitle>
              <CardDescription>
                Breakdown and edge quality metrics from this backtest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/10">
                <div className="grid divide-y divide-border/60 md:grid-cols-2 md:divide-x md:divide-y-0">
                  <section className="space-y-4 p-5">
                    <div>
                      <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                        Profit Flow
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Gross movement and net result.
                      </p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Gross profit
                        </span>
                        <span className="font-semibold text-success">
                          {money.format(result.grossProfit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Gross loss
                        </span>
                        <span className="font-semibold text-destructive">
                          {money.format(result.grossLoss)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Net P/L</span>
                        <span
                          className={cn(
                            "font-semibold",
                            result.totalPnL >= 0
                              ? "text-success"
                              : "text-destructive",
                          )}
                        >
                          {money.format(result.totalPnL)}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 p-5">
                    <div>
                      <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                        Trade Quality
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Average outcome per position.
                      </p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Average win
                        </span>
                        <span className="font-semibold text-success">
                          {money.format(result.averageWin)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Average loss
                        </span>
                        <span className="font-semibold text-destructive">
                          {money.format(result.averageLoss)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          Average fee
                        </span>
                        <span className="font-semibold text-foreground">
                          {moneyFixed.format(averageTradeFee)}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 p-5">
                    <div>
                      <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                        Edge
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Core reward and expectancy signals.
                      </p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Expectancy
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            (result.expectancy ?? 0) >= 0
                              ? "text-success"
                              : "text-destructive",
                          )}
                        >
                          {money.format(result.expectancy ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Payoff ratio
                        </span>
                        <span className="font-semibold text-foreground">
                          {ratio.format(result.payoffRatio ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Win rate</span>
                        <span className="font-semibold text-foreground">
                          {ratio.format(result.winRate)}%
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 p-5">
                    <div>
                      <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                        Risk Recovery
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Drawdown and bounce-back context.
                      </p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Recovery factor
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            (result.recoveryFactor ?? 0) >= 0
                              ? "text-success"
                              : "text-destructive",
                          )}
                        >
                          {ratio.format(result.recoveryFactor ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
                        <span className="text-muted-foreground">
                          Best / worst trade
                        </span>
                        <span className="font-semibold text-foreground">
                          <span className="text-success">
                            {money.format(result.maxWin)}
                          </span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-destructive">
                            {money.format(result.maxLoss)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          Max drawdown
                        </span>
                        <span className="font-semibold text-destructive">
                          -{ratio.format(Math.abs(result.maxDrawdownPercent))}%
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Edge Radar
                  </CardTitle>
                  <CardDescription>
                    {activeRadarView.description}
                  </CardDescription>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      {activeRadarView.label}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Radar View</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={radarView}
                      onValueChange={(value) =>
                        setRadarView(value as RadarView)
                      }
                    >
                      {radarViewOptions.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
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
              <PerformanceRadarChart
                view={radarView}
                winRate={result.winRate}
                payoffRatio={result.payoffRatio}
                profitFactor={result.profitFactor}
                recoveryFactor={result.recoveryFactor}
                maxDrawdownPercent={result.maxDrawdownPercent}
                totalTrades={result.totalTrades}
                averageTradePnL={result.averageTradePnL}
                totalFees={result.totalFees}
                trades={result.trades}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4 md:space-y-6">
          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Strategy
              </CardTitle>
              <CardDescription>
                The strategy and run configuration behind this backtest.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                    {strategyName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="inline-flex items-center gap-1">
                        @<span>{strategyCreatorUsername}</span>
                        <UserMembershipMark
                          membership={backtest.strategy?.user?.membership}
                          className="size-3"
                        />
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      {strategyIsPublic ? (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>
                        {isStrategyOwner
                          ? "Mine"
                          : strategyIsPublic
                            ? "Public"
                            : "Private"}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{backtest.strategy?.stats?.viewCount ?? "-"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {backtest.strategy?.stats?.bookmarkCount ?? "-"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center">
                {canOpenStrategy && backtest.strategy?._id ? (
                  <ButtonGroup className="w-full min-w-0 md:w-auto">
                    <Button
                      type="button"
                      size="sm"
                      className="min-w-0 flex-1 rounded-r-none"
                      asChild
                    >
                      <Link
                        to={`/strategy/${backtest.strategy._id}`}
                        className="inline-flex min-w-0 items-center justify-center gap-1.5"
                      >
                        <SquareArrowOutUpRight className="h-4 w-4" />
                        <span className="truncate">Open Strategy</span>
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon-sm"
                          className="-ml-px shrink-0 rounded-l-none"
                          aria-label="More strategy actions"
                          title="More strategy actions"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 min-w-44"
                      >
                        <DropdownMenuLabel>Strategy</DropdownMenuLabel>
                        {canOpenCreatorProfile ? (
                          <DropdownMenuItem asChild>
                            <Link
                              to={`/${strategyCreatorUsername}`}
                              className="flex items-center gap-2"
                            >
                              <UserRound className="h-4 w-4" />
                              Creator profile
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem asChild>
                          <Link
                            to={`/strategy/${backtest.strategy._id}`}
                            className="flex items-center gap-2"
                          >
                            <SquareArrowOutUpRight className="h-4 w-4" />
                            Open strategy
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            void onToggleStrategyBookmark();
                          }}
                          disabled={
                            !backtest.strategy?._id ||
                            isStrategyBookmarkUpdating
                          }
                        >
                          {isStrategyBookmarkUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isStrategyBookmarked ? (
                            <BookmarkCheck className="h-4 w-4" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                          {isStrategyBookmarked ? "Bookmarked" : "Bookmark"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ButtonGroup>
                ) : canOpenCreatorProfile ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full md:w-auto md:flex-none"
                    asChild
                  >
                    <Link
                      to={`/${strategyCreatorUsername}`}
                      className="inline-flex items-center justify-center gap-1.5"
                    >
                      <UserRound className="h-4 w-4" />
                      Creator Profile
                    </Link>
                  </Button>
                ) : (
                  <span className="inline-flex w-full items-center justify-center gap-1 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground md:w-auto md:flex-none">
                    <Lock className="h-4 w-4" />
                    Locked
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Date Window
                </CardDescription>
                <CardTitle>{dateWindowDurationLabel}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <p>
                    {format(new Date(backtest.startDate), "PPP")} to{" "}
                    {format(new Date(backtest.endDate), "PPP")}
                  </p>
                  <p>
                    Market: {backtest.symbol} / {backtest.timeframe}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Trade Setup
                </CardDescription>
                <CardTitle>
                  {backtest.hedgeMode ? "Hedge" : "One-way"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="grid gap-3">
                  <p>Initial balance: {money.format(result.initialBalance)}</p>
                  <p>{money.format(backtest.amountPerTrade)} per trade</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Position Duration
                </CardDescription>
                <CardTitle>
                  {formatDuration(result.averageTradeDuration ?? 0)}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    avg
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <p>
                    Longest / Shortest:{" "}
                    {formatDuration(result.longestTradeDuration ?? 0)} /{" "}
                    {formatDuration(result.shortestTradeDuration ?? 0)}
                  </p>
                  <p>Total trades: {result.totalTrades}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equity" className="space-y-4 md:space-y-6">
          <Card className="max-w-full min-w-0 border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AreaChart className="h-4 w-4 text-primary" />
                Equity Curve
              </CardTitle>
              <CardDescription>
                From {money.format(result.initialBalance)} to{" "}
                {money.format(result.finalBalance)} with {result.totalTrades}{" "}
                closed trades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EquityCurve
                data={result.equityCurves}
                initialBalance={result.initialBalance}
                finalBalance={result.finalBalance}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4 md:space-y-6">
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Trade Activity
              </CardTitle>
              <CardDescription>
                Shadcn-style bar chart for when trades happen across date and
                time views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TradeActivityBarChart trades={result.trades} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CandlestickChart className="h-4 w-4 text-primary" />
                Trade History
              </CardTitle>
              <CardDescription>
                Compact execution log from the backtest result payload.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-full min-w-0 space-y-4 overflow-x-hidden">
              <div className="hidden max-w-full md:block">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="px-2 py-3">Side</th>
                      <th className="px-2 py-3">Entry (UTC)</th>
                      <th className="px-2 py-3">Exit (UTC)</th>
                      <th className="px-2 py-3">Entry Price</th>
                      <th className="px-2 py-3">Exit Price</th>
                      <th className="px-2 py-3">PnL</th>
                      <th className="px-2 py-3">Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentTrades.map((trade, index) => (
                      <tr
                        key={`${trade.entryTime}-${trade.exitTime}-${index}`}
                        className="border-b last:border-none"
                      >
                        <td className="px-2 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              trade.side === "buy"
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {trade.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {formatDateTime(trade.entryTime)}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {formatDateTime(trade.exitTime)}
                        </td>
                        <td className="px-2 py-3">
                          {money.format(trade.entryPrice)}
                        </td>
                        <td className="px-2 py-3">
                          {money.format(trade.exitPrice)}
                        </td>
                        <td
                          className={`px-2 py-3 font-medium ${
                            trade.pnl >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {money.format(trade.pnl)} (
                          {ratio.format(trade.pnlPercent)}%)
                        </td>
                        <td className="px-2 py-3">
                          <span className="rounded-full border px-2 py-1 text-xs">
                            {trade.exitReason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {recentTrades.map((trade, index) => (
                  <div
                    key={`${trade.entryTime}-${trade.exitTime}-${index}-mobile`}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          trade.side === "buy"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {trade.side.toUpperCase()}
                      </span>
                      <span
                        className={`font-medium ${
                          trade.pnl >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {money.format(trade.pnl)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entry: {formatDateTime(trade.entryTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Exit: {formatDateTime(trade.exitTime)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money.format(trade.entryPrice)} {"->"}{" "}
                      {money.format(trade.exitPrice)} (
                      {ratio.format(trade.pnlPercent)}%)
                    </p>
                  </div>
                ))}
              </div>

              {totalTradesPages > 1 && (
                <Pagination className="justify-center">
                  <PaginationContent className="flex-nowrap justify-center">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setTradesPage((prev) => Math.max(1, prev - 1));
                        }}
                        className={
                          tradesPage <= 1
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>

                    {tradePageItems.map((item, index) =>
                      typeof item === "number" ? (
                        <PaginationItem key={`trades-page-${item}`}>
                          <PaginationLink
                            href="#"
                            isActive={item === tradesPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setTradesPage(item);
                            }}
                          >
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={`${item}-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setTradesPage((prev) =>
                            Math.min(totalTradesPages, prev + 1),
                          );
                        }}
                        className={
                          tradesPage >= totalTradesPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
