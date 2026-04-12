import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CandlestickChart,
  ChartNoAxesCombined,
  Compass,
  FlaskConical,
  Loader2,
  Sparkles,
  SquareArrowOutUpRight,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import { fetchExchangeData } from "@/api/backtest";
import { fetchBookmarks } from "@/api/bookmark";
import { fetchStrategies } from "@/api/strategy";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";

type StrategyItem = {
  _id: string;
  name: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    username?: string;
  };
  stats?: {
    viewCount?: number;
    bookmarkCount?: number;
  };
};

type StrategyResponse = {
  result?: {
    total?: number;
    strategies?: StrategyItem[];
  };
};

type BookmarkResponse = {
  result?: {
    total?: number;
  };
};

type ExchangeDataResponse = {
  result?: {
    data?: {
      symbols?: string[];
      timeframes?: Record<string, string>;
    };
  };
};

function toPrettyDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [isLoading, setIsLoading] = useState(true);
  const [myStrategiesTotal, setMyStrategiesTotal] = useState(0);
  const [bookmarkedStrategiesTotal, setBookmarkedStrategiesTotal] = useState(0);
  const [bookmarkedBacktestsTotal, setBookmarkedBacktestsTotal] = useState(0);
  const [symbolsCount, setSymbolsCount] = useState(0);
  const [timeframesCount, setTimeframesCount] = useState(0);
  const [recentMyStrategies, setRecentMyStrategies] = useState<StrategyItem[]>(
    [],
  );
  const [popularStrategies, setPopularStrategies] = useState<StrategyItem[]>(
    [],
  );
  const [activitySource, setActivitySource] = useState<StrategyItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setIsLoading(true);

      try {
        const [
          myStrategiesRes,
          popularStrategiesRes,
          strategyBookmarksRes,
          backtestBookmarksRes,
          exchangeRes,
        ] = (await Promise.all([
          fetchStrategies({
            page: 1,
            limit: 60,
            search: "",
            sortBy: "createdAt",
            order: "desc",
            source: "mine",
          }),
          fetchStrategies({
            page: 1,
            limit: 5,
            search: "",
            sortBy: "popular",
            order: "desc",
            source: "all",
            isPublic: true,
          }),
          fetchBookmarks({
            page: 1,
            limit: 1,
            targetType: "strategy",
            sortBy: "updatedAt",
            order: "desc",
          }),
          fetchBookmarks({
            page: 1,
            limit: 1,
            targetType: "backtest",
            sortBy: "updatedAt",
            order: "desc",
          }),
          fetchExchangeData(),
        ])) as [
          StrategyResponse,
          StrategyResponse,
          BookmarkResponse,
          BookmarkResponse,
          ExchangeDataResponse,
        ];

        const mine = myStrategiesRes?.result?.strategies ?? [];
        const popular = popularStrategiesRes?.result?.strategies ?? [];
        const symbols = exchangeRes?.result?.data?.symbols ?? [];
        const timeframesMap = exchangeRes?.result?.data?.timeframes ?? {};

        setMyStrategiesTotal(myStrategiesRes?.result?.total ?? 0);
        setBookmarkedStrategiesTotal(strategyBookmarksRes?.result?.total ?? 0);
        setBookmarkedBacktestsTotal(backtestBookmarksRes?.result?.total ?? 0);
        setSymbolsCount(symbols.length);
        setTimeframesCount(Object.keys(timeframesMap).length);
        setRecentMyStrategies(mine.slice(0, 6));
        setActivitySource(mine);
        setPopularStrategies(popular);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load dashboard"));
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, [isAuthenticated]);

  const activityData = useMemo(() => {
    const today = new Date();
    const map = new Map<string, number>();

    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      map.set(key, 0);
    }

    activitySource.forEach((item) => {
      if (!item.createdAt) return;
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) {
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    });

    return Array.from(map.entries()).map(([date, count]) => ({
      date,
      label: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
      }),
      count,
    }));
  }, [activitySource]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Sign In To View Dashboard</CardTitle>
            <CardDescription>
              Dashboard metrics are personalized to your account activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/auth">Go To Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.9fr] lg:items-end">
          <div className="space-y-4">
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Control Center
            </p>

            <div className="space-y-3">
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-4xl">
                <ChartNoAxesCombined className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
                Welcome Back, {user?.name || "Trader"}
              </h1>

              <p className="max-w-3xl text-muted-foreground">
                Monitor your strategy workspace, keep an eye on saved ideas, and
                stay close to the markets you can backtest right now.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-primary" />
                {isLoading ? "..." : myStrategiesTotal} strategies
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                <Bookmark className="h-3.5 w-3.5 text-primary" />
                {isLoading
                  ? "..."
                  : bookmarkedStrategiesTotal + bookmarkedBacktestsTotal}{" "}
                saved items
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                <CandlestickChart className="h-3.5 w-3.5 text-primary" />
                {isLoading
                  ? "..."
                  : `${symbolsCount} Symbols x ${timeframesCount} TF`}
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 sm:p-5">
            <p className="text-xs text-muted-foreground uppercase">
              Workspace Pulse
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Recently updated</p>
                  <p className="text-xs text-muted-foreground">
                    Strategies ready for another pass
                  </p>
                </div>
                <span className="text-lg font-semibold">
                  {isLoading ? "..." : recentMyStrategies.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Popular ideas</p>
                  <p className="text-xs text-muted-foreground">
                    Public strategies worth studying
                  </p>
                </div>
                <span className="text-lg font-semibold">
                  {isLoading ? "..." : popularStrategies.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Backtest-ready universe</p>
                  <p className="text-xs text-muted-foreground">
                    Symbols and timeframes loaded from exchange data
                  </p>
                </div>
                <span className="text-lg font-semibold">
                  {isLoading ? "..." : symbolsCount * timeframesCount}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              My Strategies
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {isLoading ? "..." : myStrategiesTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Draft, public, and private systems you own.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              Strategy Bookmarks
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {isLoading ? "..." : bookmarkedStrategiesTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Saved strategy ideas you want to revisit.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CandlestickChart className="h-4 w-4 text-primary" />
              Backtest Bookmarks
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {isLoading ? "..." : bookmarkedBacktestsTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Result pages worth comparing again later.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Symbols x Timeframes
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {isLoading ? "..." : `${symbolsCount} x ${timeframesCount}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            The current market universe available for backtesting.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-w-0 border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">
              Strategy Activity (14 Days)
            </CardTitle>
            <CardDescription>
              New strategy creation trend from your recent strategy set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading activity...
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={activityData}
                    margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="dashboardActivity"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-primary)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-primary)"
                          stopOpacity={0.03}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      minTickGap={18}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#dashboardActivity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="min-w-0 border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
              <CardDescription>
                Jump into the next useful workspace step.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link
                to="/strategy"
                state={{ openStrategyBuilder: true }}
                className="group rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Target className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">Create Strategy</p>
                      <p className="text-xs text-muted-foreground">
                        Start a fresh ruleset from scratch.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link
                to="/strategy"
                className="group rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Compass className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">Explore Strategies</p>
                      <p className="text-xs text-muted-foreground">
                        Browse your catalog and public ideas.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link
                to="/backtest"
                className="group rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <FlaskConical className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">Run Backtest</p>
                      <p className="text-xs text-muted-foreground">
                        Validate a setup against market history.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link
                to="/bookmark"
                className="group rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Bookmark className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">Open Bookmarks</p>
                      <p className="text-xs text-muted-foreground">
                        Revisit saved strategies and backtests.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">
                Popular Public Strategies
              </CardTitle>
              <CardDescription>
                Visibility snapshot from top-viewed public strategies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Loading list...
                </div>
              ) : popularStrategies.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No public strategies available.
                </div>
              ) : (
                popularStrategies.map((item, index) => (
                  <article
                    key={item._id}
                    className="rounded-xl border p-3 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold text-muted-foreground">
                            {index + 1}
                          </span>
                          <p className="line-clamp-1 font-medium">
                            {item.name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          by @{item.user?.username || "unknown"}
                        </p>
                      </div>

                      <Button
                        asChild
                        size="icon-sm"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        <Link
                          to={`/strategy/${item._id}`}
                          aria-label="Open strategy"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {item.stats?.viewCount ?? 0} views
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        <Bookmark className="h-3.5 w-3.5" />
                        {item.stats?.bookmarkCount ?? 0} saves
                      </span>
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="min-w-0 border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Recently Updated By You</CardTitle>
          <CardDescription>
            Your latest edited strategies, ready for quick iteration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Loading your recent strategies...
            </div>
          ) : recentMyStrategies.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              You have no strategies yet. Create your first one to start
              iterating.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentMyStrategies.map((item) => (
                <article
                  key={item._id}
                  className="rounded-xl border p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 font-semibold">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {toPrettyDate(item.updatedAt)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      <ChartNoAxesCombined className="h-3.5 w-3.5" />
                      Ready
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {item.stats?.viewCount ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                      <Bookmark className="h-3.5 w-3.5" />
                      {item.stats?.bookmarkCount ?? 0}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="outline">
                      <Link
                        to={`/strategy/${item._id}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                        Open
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link
                        to="/backtest"
                        className="inline-flex items-center gap-1.5"
                      >
                        <CandlestickChart className="h-3.5 w-3.5" />
                        Backtest
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
