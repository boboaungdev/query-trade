import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarClock,
  CandlestickChart,
  ChevronsUpDown,
  CircleDollarSign,
  Compass,
  Loader2,
  Plus,
  Percent,
  Play,
  Bookmark,
  BookmarkCheck,
  RefreshCcw,
  Search,
  ShieldAlert,
  ListFilter,
  Sparkles,
  ArrowLeftRight,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import { createBookmark, deleteBookmark } from "@/api/bookmark";
import {
  fetchBacktestById,
  fetchExchangeData,
  runBacktest,
  updateBacktest,
} from "@/api/backtest";
import {
  fetchStrategies,
  type StrategySource,
} from "@/api/strategy";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type TimeframeMap = Record<string, string>;

type ExchangeDataPayload = {
  symbols: string[];
  timeframes: TimeframeMap;
};

type ExchangeDataResponse = {
  status: boolean;
  message: string;
  result: {
    data: ExchangeDataPayload;
  };
};

type BacktestResult = {
  initialBalance: number;
  finalBalance: number;
  totalPnL: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  totalFees: number;
  averageTradePnL: number;
  equityCurves: Array<{ timestamp: number; equity: number }>;
  trades: Array<{
    side: "buy" | "sell" | string;
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    exitReason: "stopLoss" | "takeProfit" | string;
  }>;
};

type BacktestRunResponse = {
  status: boolean;
  message: string;
  result: {
    backtest: {
      _id: string;
      result: BacktestResult;
    };
  };
};

type EditableBacktestDetail = {
  _id: string;
  exchange?: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialBalance?: number;
  amountPerTrade: number;
  entryFeeRate?: number;
  exitFeeRate?: number;
  hedgeMode?: boolean;
  strategy?: {
    _id?: string;
    name?: string;
  };
  user?: {
    _id?: string;
  };
};

type BacktestDraftSnapshot = {
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialBalance: string;
  amountPerTrade: string;
  entryFeeRate: string;
  exitFeeRate: string;
  hedgeMode: boolean;
  strategyId: string;
};

type StrategyItem = {
  _id: string;
  name: string;
  isBookmarked?: boolean;
  isPublic?: boolean;
  stats?: {
    viewCount?: number;
    bookmarkCount?: number;
  };
  user?: {
    _id?: string;
    username?: string;
  };
};

type StrategyListResult = {
  total?: number;
  totalPage?: number;
  currentPage?: number;
  limitPerPage?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  strategies?: StrategyItem[];
  indicators?: StrategyItem[];
};

type StrategyListResponse = {
  status: boolean;
  message: string;
  result: StrategyListResult;
};

const inFlightRequestMap = new Map<string, Promise<unknown>>();

function dedupeRequest<T>(key: string, requestFn: () => Promise<T>) {
  const existing = inFlightRequestMap.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const next = requestFn().finally(() => {
    inFlightRequestMap.delete(key);
  });

  inFlightRequestMap.set(key, next);
  return next;
}

function toUtcStartOfDayIso(date: Date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  ).toISOString();
}

function normalizeSymbolText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitizeNumericInput(value: string, allowDecimal = true) {
  const cleaned = value.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");

  if (!allowDecimal) {
    return cleaned;
  }

  const [head, ...tail] = cleaned.split(".");
  return tail.length > 0 ? `${head}.${tail.join("")}` : head;
}

export default function BacktestPage() {
  const { backtestId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isEditing = Boolean(backtestId);

  const [exchange, setExchange] = useState("binance");
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("");

  const [symbols, setSymbols] = useState<string[]>([]);
  const [timeframes, setTimeframes] = useState<TimeframeMap>({});

  const [symbolSearch, setSymbolSearch] = useState("");
  const [isSymbolMenuOpen, setIsSymbolMenuOpen] = useState(false);
  const symbolSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [visibleSymbolCount, setVisibleSymbolCount] = useState(20);

  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [strategySearch, setStrategySearch] = useState("");
  const [isStrategyMenuOpen, setIsStrategyMenuOpen] = useState(false);
  const strategySearchInputRef = useRef<HTMLInputElement | null>(null);
  const [strategyPage, setStrategyPage] = useState(1);
  const [strategyHasNextPage, setStrategyHasNextPage] = useState(false);
  const [isAppendingStrategies, setIsAppendingStrategies] = useState(false);
  const [strategySortBy, setStrategySortBy] = useState<
    "name" | "createdAt" | "updatedAt" | "popular"
  >("name");
  const [strategyOrder, setStrategyOrder] = useState<"asc" | "desc">("asc");
  const [strategySource, setStrategySource] = useState<StrategySource>("all");
  const [strategyPublicOnly, setStrategyPublicOnly] = useState(true);
  const [selectedStrategyName, setSelectedStrategyName] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const strategyIdRef = useRef("");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date("2025-01-01T00:00:00Z"),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date("2025-03-01T00:00:00Z"),
  );
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState("10000");
  const [amountPerTrade, setAmountPerTrade] = useState("100");
  const [entryFeeRate, setEntryFeeRate] = useState("0.00");
  const [exitFeeRate, setExitFeeRate] = useState("0.00");
  const [hedgeMode, setHedgeMode] = useState(false);

  const [isLoadingExchange, setIsLoadingExchange] = useState(true);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingBacktest, setIsLoadingBacktest] = useState(isEditing);
  const [isRunning, setIsRunning] = useState(false);
  const [exchangeRefreshTick, setExchangeRefreshTick] = useState(0);
  const [strategyRefreshTick, setStrategyRefreshTick] = useState(0);
  const [hasExchangeData, setHasExchangeData] = useState(false);
  const [hasHydratedFromBacktest, setHasHydratedFromBacktest] = useState(false);
  const [initialSnapshot, setInitialSnapshot] =
    useState<BacktestDraftSnapshot | null>(null);
  const [updatingStrategyIds, setUpdatingStrategyIds] = useState<Set<string>>(
    new Set(),
  );
  const preselectedStrategyId =
    typeof location.state === "object" &&
    location.state !== null &&
    "strategyId" in location.state &&
    typeof (location.state as { strategyId?: unknown }).strategyId === "string"
      ? (location.state as { strategyId: string }).strategyId
      : "";
  const preselectedStrategyName =
    typeof location.state === "object" &&
    location.state !== null &&
    "strategyName" in location.state &&
    typeof (location.state as { strategyName?: unknown }).strategyName ===
      "string"
      ? (location.state as { strategyName: string }).strategyName
      : "";

  useEffect(() => {
    strategyIdRef.current = strategyId;
  }, [strategyId]);

  useEffect(() => {
    if (isEditing) return;
    if (!preselectedStrategyId) return;

    setStrategyId(preselectedStrategyId);
    setSelectedStrategyName(preselectedStrategyName);
  }, [isEditing, preselectedStrategyId, preselectedStrategyName]);

  useEffect(() => {
    if (!isEditing) {
      setHasHydratedFromBacktest(false);
      setIsLoadingBacktest(false);
      setInitialSnapshot(null);
      return;
    }

    let isMounted = true;

    const loadBacktest = async () => {
      setIsLoadingBacktest(true);

      try {
        const response = (await fetchBacktestById(backtestId)) as {
          result?: { backtest?: EditableBacktestDetail };
        };
        const backtest = response?.result?.backtest;

        if (!isMounted || !backtest) {
          return;
        }

        if (backtest.user?._id && user?._id && backtest.user._id !== user._id) {
          toast.error("You can only edit your own backtests");
          navigate(`/backtest/${backtestId}`, { replace: true });
          return;
        }

        const nextSymbol = backtest.symbol || "";
        const nextTimeframe = backtest.timeframe || "";
        const nextStartDate = backtest.startDate
          ? new Date(backtest.startDate)
          : undefined;
        const nextEndDate = backtest.endDate
          ? new Date(backtest.endDate)
          : undefined;
        const nextInitialBalance = String(backtest.initialBalance ?? 10000);
        const nextAmountPerTrade = String(backtest.amountPerTrade ?? 100);
        const nextEntryFeeRate = String(backtest.entryFeeRate ?? 0);
        const nextExitFeeRate = String(backtest.exitFeeRate ?? 0);
        const nextHedgeMode = Boolean(backtest.hedgeMode);
        const nextStrategyId = backtest.strategy?._id ?? "";
        const nextStrategyName = backtest.strategy?.name ?? "";

        setSymbol(nextSymbol);
        setTimeframe(nextTimeframe);
        setExchange(backtest.exchange || "binance");
        setStartDate(nextStartDate);
        setEndDate(nextEndDate);
        setInitialBalance(nextInitialBalance);
        setAmountPerTrade(nextAmountPerTrade);
        setEntryFeeRate(nextEntryFeeRate);
        setExitFeeRate(nextExitFeeRate);
        setHedgeMode(nextHedgeMode);
        setStrategyId(nextStrategyId);
        setSelectedStrategyName(nextStrategyName);
        setInitialSnapshot({
          symbol: nextSymbol,
          timeframe: nextTimeframe,
          startDate: nextStartDate ? toUtcStartOfDayIso(nextStartDate) : "",
          endDate: nextEndDate ? toUtcStartOfDayIso(nextEndDate) : "",
          initialBalance: nextInitialBalance,
          amountPerTrade: nextAmountPerTrade,
          entryFeeRate: nextEntryFeeRate,
          exitFeeRate: nextExitFeeRate,
          hedgeMode: nextHedgeMode,
          strategyId: nextStrategyId,
        });
        setHasHydratedFromBacktest(true);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        toast.error(getApiErrorMessage(error, "Failed to load backtest"));
        navigate("/leaderboard", { replace: true });
      } finally {
        if (isMounted) {
          setIsLoadingBacktest(false);
        }
      }
    };

    void loadBacktest();

    return () => {
      isMounted = false;
    };
  }, [backtestId, isEditing, navigate, user?._id]);

  useEffect(() => {
    const loadExchangeData = async () => {
      setIsLoadingExchange(true);
      setHasExchangeData(false);
      setIsLoadingStrategies(true);

      try {
        const response = (await dedupeRequest(`exchange-data:${exchange}`, () =>
          fetchExchangeData({ exchange }),
        )) as ExchangeDataResponse;

        const payload = response?.result?.data;

        if (!payload?.symbols?.length) {
          throw new Error("No symbols returned");
        }

        setSymbols(payload.symbols);
        setTimeframes(payload.timeframes);

        const timeframeKeys = Object.keys(payload.timeframes);
        const preferredSymbol = payload.symbols.includes("BTC/USDT")
          ? "BTC/USDT"
          : (payload.symbols[0] ?? "");
        const preferredTimeframe = timeframeKeys.includes("15m")
          ? "15m"
          : (timeframeKeys[0] ?? "");

        if (!isEditing || !hasHydratedFromBacktest) {
          setSymbol(preferredSymbol);
          setTimeframe(preferredTimeframe);
        }
        setHasExchangeData(true);
      } catch (error) {
        setStrategies([]);
        setStrategyHasNextPage(false);
        toast.error(
          getApiErrorMessage(error, "Failed to fetch exchange data"),
          {
            id: "backtest-exchange-fetch-error",
          },
        );
        setIsLoadingStrategies(false);
      } finally {
        setIsLoadingExchange(false);
      }
    };

    void loadExchangeData();
  }, [exchange, exchangeRefreshTick, hasHydratedFromBacktest, isEditing]);

  useEffect(() => {
    if (isLoadingExchange || !hasExchangeData) {
      return;
    }

    const timer = setTimeout(() => {
      const loadStrategiesPage = async () => {
        setIsLoadingStrategies(true);

        try {
          const queryKey = [
            "strategies",
            strategyPage,
            12,
            strategySearch.trim(),
            strategySortBy,
            strategyOrder,
            strategySource,
            strategyPublicOnly,
          ].join(":");

          const response = (await dedupeRequest(queryKey, () =>
            fetchStrategies({
              page: strategyPage,
              search: strategySearch.trim(),
              sortBy: strategySortBy,
              order: strategyOrder,
              source: strategySource,
              isPublic:
                strategySource === "all" ? strategyPublicOnly : undefined,
            }),
          )) as StrategyListResponse;

          const result = response?.result;
          const pageItems = result?.strategies ?? result?.indicators ?? [];
          setStrategies((prev) => {
            if (strategyPage === 1) {
              return pageItems;
            }
            const merged = [...prev, ...pageItems];
            return Array.from(
              new Map(merged.map((item) => [item._id, item])).values(),
            );
          });
          setStrategyHasNextPage(Boolean(result?.hasNextPage));
          setIsAppendingStrategies(false);

          const matchedCurrent = pageItems.find(
            (item) => item._id === strategyIdRef.current,
          );

          if (matchedCurrent) {
            setSelectedStrategyName(matchedCurrent.name);
          } else if (!strategyIdRef.current) {
            setSelectedStrategyName("");
          }
        } catch (error) {
          toast.error(getApiErrorMessage(error, "Failed to fetch strategies"));
          setIsAppendingStrategies(false);
        } finally {
          setIsLoadingStrategies(false);
        }
      };

      void loadStrategiesPage();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    hasExchangeData,
    isLoadingExchange,
    strategyRefreshTick,
    strategySource,
    strategyPublicOnly,
    strategyOrder,
    strategyPage,
    strategySearch,
    strategySortBy,
  ]);

  const timeframeOptions = Object.keys(timeframes);

  const visibleSymbols = useMemo(() => {
    const search = normalizeSymbolText(symbolSearch.trim());

    if (!search) {
      return symbols.slice(0, visibleSymbolCount);
    }

    return symbols
      .filter((item) => normalizeSymbolText(item).includes(search))
      .slice(0, visibleSymbolCount);
  }, [symbolSearch, symbols, visibleSymbolCount]);

  const totalSymbolMatches = useMemo(() => {
    const search = normalizeSymbolText(symbolSearch.trim());
    if (!search) return symbols.length;
    return symbols.filter((item) => normalizeSymbolText(item).includes(search))
      .length;
  }, [symbolSearch, symbols]);

  useEffect(() => {
    setVisibleSymbolCount(20);
  }, [symbolSearch, isSymbolMenuOpen]);

  const selectedStrategy = useMemo(
    () => strategies.find((item) => item._id === strategyId),
    [strategies, strategyId],
  );
  const selectedStrategyLabel =
    selectedStrategy?.name || selectedStrategyName || "No strategy selected";
  const currentStartDateIso = startDate ? toUtcStartOfDayIso(startDate) : "";
  const currentEndDateIso = endDate ? toUtcStartOfDayIso(endDate) : "";
  const isSetupReady =
    !isLoadingExchange &&
    !isLoadingStrategies &&
    !isLoadingBacktest &&
    symbols.length > 0 &&
    Boolean(symbol) &&
    Boolean(timeframe) &&
    Boolean(strategyId);
  const hasChanges = isEditing
    ? Boolean(
        initialSnapshot &&
        (initialSnapshot.symbol !== symbol ||
          initialSnapshot.timeframe !== timeframe ||
          initialSnapshot.startDate !== currentStartDateIso ||
          initialSnapshot.endDate !== currentEndDateIso ||
          initialSnapshot.initialBalance !== initialBalance ||
          initialSnapshot.amountPerTrade !== amountPerTrade ||
          initialSnapshot.entryFeeRate !== entryFeeRate ||
          initialSnapshot.exitFeeRate !== exitFeeRate ||
          initialSnapshot.hedgeMode !== hedgeMode ||
          initialSnapshot.strategyId !== strategyId),
      )
    : true;

  const onToggleStrategyBookmark = async (strategyIdToToggle: string) => {
    if (!user?._id) {
      toast.error("Please sign in to bookmark strategies.");
      return;
    }

    const currentStrategy = strategies.find(
      (item) => item._id === strategyIdToToggle,
    );
    if (!currentStrategy) return;

    if (updatingStrategyIds.has(strategyIdToToggle)) {
      return;
    }

    const isBookmarked = Boolean(currentStrategy.isBookmarked);
    const updateStrategyBookmarkCount = (delta: 1 | -1) => {
      setStrategies((prev) =>
        prev.map((item) => {
          if (item._id !== strategyIdToToggle) return item;

          const current =
            typeof item.stats?.bookmarkCount === "number"
              ? item.stats.bookmarkCount
              : 0;
          const next = Math.max(0, current + delta);

          return {
            ...item,
            stats: {
              ...item.stats,
              bookmarkCount: next,
            },
          };
        }),
      );
    };

    setUpdatingStrategyIds((prev) => new Set(prev).add(strategyIdToToggle));

    try {
      if (isBookmarked) {
        const response = await deleteBookmark({
          targetType: "strategy",
          targetId: strategyIdToToggle,
        });

        setStrategies((prev) =>
          prev.map((item) =>
            item._id === strategyIdToToggle
              ? { ...item, isBookmarked: false }
              : item,
          ),
        );
        updateStrategyBookmarkCount(-1);
        if (strategySource === "bookmarked") {
          setStrategies((prev) =>
            prev.filter((item) => item._id !== strategyIdToToggle),
          );
        }
        toast.success(response?.message || "Bookmark removed successfully.");
      } else {
        const response = await createBookmark({
          targetType: "strategy",
          target: strategyIdToToggle,
        });

        setStrategies((prev) =>
          prev.map((item) =>
            item._id === strategyIdToToggle
              ? { ...item, isBookmarked: true }
              : item,
          ),
        );
        updateStrategyBookmarkCount(1);
        if (strategySource === "bookmarked") {
          setStrategyPage(1);
          setStrategyRefreshTick((prev) => prev + 1);
        }
        toast.success(response?.message || "Bookmarked successfully.");
      }
    } catch (error) {
      const status =
        typeof error === "object" && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (isBookmarked && status === 404) {
        setStrategies((prev) =>
          prev.map((item) =>
            item._id === strategyIdToToggle
              ? { ...item, isBookmarked: false }
              : item,
          ),
        );
        updateStrategyBookmarkCount(-1);
        if (strategySource === "bookmarked") {
          setStrategies((prev) =>
            prev.filter((item) => item._id !== strategyIdToToggle),
          );
        }
        toast.success("Bookmark removed successfully.");
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update bookmark"));
    } finally {
      setUpdatingStrategyIds((prev) => {
        const next = new Set(prev);
        next.delete(strategyIdToToggle);
        return next;
      });
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedInitialBalance = Number(initialBalance);
    const parsedAmountPerTrade = Number(amountPerTrade);
    const parsedEntryFee = Number(entryFeeRate);
    const parsedExitFee = Number(exitFeeRate);

    if (!Number.isFinite(parsedInitialBalance) || parsedInitialBalance <= 0) {
      toast.error("Initial balance must be greater than 0");
      return;
    }

    if (!Number.isFinite(parsedAmountPerTrade) || parsedAmountPerTrade <= 0) {
      toast.error("Amount per trade must be greater than 0");
      return;
    }

    if (!symbol.trim()) {
      toast.error("Please select a symbol");
      return;
    }

    if (!timeframe.trim()) {
      toast.error("Please select a timeframe");
      return;
    }

    if (!strategyId.trim()) {
      toast.error("Strategy ID is required");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    const startDateIso = toUtcStartOfDayIso(startDate);
    const endDateIso = toUtcStartOfDayIso(endDate);

    if (
      Number.isNaN(new Date(startDateIso).getTime()) ||
      Number.isNaN(new Date(endDateIso).getTime())
    ) {
      toast.error("Please provide valid start and end dates");
      return;
    }

    if (new Date(startDateIso).getTime() >= new Date(endDateIso).getTime()) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsRunning(true);
    try {
      const payload = {
        exchange,
        symbol,
        timeframe,
        startDate: startDateIso,
        endDate: endDateIso,
        amountPerTrade: parsedAmountPerTrade,
        initialBalance: parsedInitialBalance,
        entryFeeRate: parsedEntryFee,
        exitFeeRate: parsedExitFee,
        strategyId: strategyId.trim(),
        hedgeMode,
      };

      const backtestPromise = (
        isEditing ? updateBacktest(backtestId, payload) : runBacktest(payload)
      ) as Promise<BacktestRunResponse>;

      const response = await backtestPromise;
      const nextResult = response?.result?.backtest?.result;

      if (!nextResult) {
        throw new Error("Invalid backtest result");
      }

      const nextBacktestId = response?.result?.backtest?._id;

      if (!nextBacktestId) {
        throw new Error("Saved backtest ID missing");
      }

      navigate(`/backtest/${nextBacktestId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(getApiErrorMessage(error, "Backtest failed"));
        return;
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden md:space-y-6">
      <div className="min-w-0">
        <Card className="min-w-0 py-0 text-sm">
          <CardHeader className="gap-4 px-5 pt-5 pb-0 md:px-6 md:pt-6">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-md border bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Backtest Setup
              </span>
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-primary">
                    <CandlestickChart className="h-5 w-5" />
                  </span>
                  {isEditing
                    ? "Refine this saved backtest"
                    : "Build a cleaner simulation run"}
                </CardTitle>
                <CardDescription className="max-w-md text-sm leading-6">
                  {isEditing
                    ? "Adjust the market, strategy, and risk settings, then save the updated simulation back into the same result flow."
                    : "Pick your market, tune the capital plan, and launch a polished backtest flow with everything organized into a clearer control panel."}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                <CandlestickChart className="h-3.5 w-3.5 text-primary" />
                {symbol || "Select symbol"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {timeframe || "Select timeframe"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[170px] truncate">
                  {selectedStrategyLabel}
                </span>
              </span>
            </div>
          </CardHeader>

          <CardContent className="relative min-w-0 px-5 pt-5 pb-5 md:px-6 md:pb-6">
            <form onSubmit={onSubmit}>
              <fieldset
                disabled={isRunning || isLoadingBacktest}
                className="min-w-0 space-y-4 border-0 p-0"
              >
                <div className="rounded-xl border bg-card p-4 lg:p-5">
                  <div className="mb-4">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Market & timing
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Choose the pair, candle interval, and historical range.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="inline-flex items-center gap-1.5">
                        <CandlestickChart className="h-3.5 w-3.5 text-primary" />
                        Symbol
                      </Label>
                      <Dialog
                        open={isSymbolMenuOpen}
                        onOpenChange={(open) => {
                          setIsSymbolMenuOpen(open);
                          if (open) {
                            setVisibleSymbolCount(20);
                          }
                          if (!open) {
                            setSymbolSearch("");
                            setVisibleSymbolCount(20);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "relative w-full justify-start overflow-hidden pr-10 text-left",
                              !isLoadingExchange &&
                                !symbol &&
                                "text-muted-foreground",
                            )}
                            disabled={isLoadingExchange}
                          >
                            <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                              {isLoadingExchange
                                ? "Loading symbols..."
                                : symbol || "Select symbol"}
                            </span>
                            <ChevronsUpDown className="absolute top-1/2 right-3 h-4 w-4 shrink-0 -translate-y-1/2 opacity-50" />
                          </Button>
                        </DialogTrigger>

                        <DialogContent
                          className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 md:top-[10vh] md:max-w-2xl"
                          onOpenAutoFocus={(event) => {
                            event.preventDefault();
                          }}
                        >
                          <DialogHeader className="border-b px-4 pt-4 pb-3">
                            <DialogTitle>Select symbol</DialogTitle>
                            <DialogDescription>
                              Pick the market symbol you want to backtest.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 px-4 py-4">
                            <div className="relative">
                              <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                ref={symbolSearchInputRef}
                                value={symbolSearch}
                                onChange={(event) =>
                                  setSymbolSearch(event.target.value)
                                }
                                placeholder="Search symbol"
                                className="h-9 w-full pr-10 pl-7"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="absolute top-1/2 right-1.5 h-6 w-6 -translate-y-1/2"
                                disabled={isLoadingExchange}
                                onClick={() => {
                                  setVisibleSymbolCount(20);
                                  setExchangeRefreshTick((prev) => prev + 1);
                                }}
                              >
                                <RefreshCcw
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    isLoadingExchange && "animate-spin",
                                  )}
                                />
                              </Button>
                            </div>
                          </div>
                          <DropdownMenuSeparator />
                          {visibleSymbols.length === 0 ? (
                            <p className="px-4 pb-4 text-xs text-muted-foreground">
                              No symbols found.
                            </p>
                          ) : (
                            <ScrollArea
                              className="h-[320px] px-4 pb-4"
                              onScrollCapture={(event) => {
                                const node = event.target as HTMLElement;
                                const distanceToBottom =
                                  node.scrollHeight -
                                  node.scrollTop -
                                  node.clientHeight;

                                if (
                                  distanceToBottom < 24 &&
                                  visibleSymbolCount < totalSymbolMatches
                                ) {
                                  setVisibleSymbolCount((prev) => prev + 20);
                                }
                              }}
                            >
                              <div className="space-y-1">
                                {visibleSymbols.map((item) => (
                                  <div
                                    key={item}
                                    role="button"
                                    tabIndex={0}
                                    className={cn(
                                      "flex w-full overflow-hidden rounded-lg border px-3.5 py-2 text-left text-sm transition-colors",
                                      item === symbol
                                        ? "border-primary/40 bg-muted"
                                        : "border-border/70 bg-muted/40 hover:bg-accent",
                                    )}
                                    onClick={() => {
                                      setSymbol(item);
                                      setIsSymbolMenuOpen(false);
                                    }}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key !== "Enter" &&
                                        event.key !== " "
                                      ) {
                                        return;
                                      }

                                      event.preventDefault();
                                      setSymbol(item);
                                      setIsSymbolMenuOpen(false);
                                    }}
                                  >
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      <Label className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                        <CalendarClock className="h-3.5 w-3.5 text-primary" />
                        Timeframe
                      </Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-between",
                              !timeframe && "text-muted-foreground",
                            )}
                            disabled={isLoadingExchange}
                          >
                            <span className="truncate">
                              {timeframe || "Select timeframe"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
                        >
                          <DropdownMenuLabel>
                            Select timeframe
                          </DropdownMenuLabel>
                          {timeframeOptions.length === 0 ? (
                            <p className="px-2 py-2 text-xs text-muted-foreground">
                              No timeframe found.
                            </p>
                          ) : (
                            <ScrollArea className="h-[210px]">
                              <DropdownMenuRadioGroup
                                value={timeframe}
                                onValueChange={setTimeframe}
                              >
                                {timeframeOptions.map((tf) => (
                                  <DropdownMenuRadioItem
                                    key={tf}
                                    value={tf}
                                    className="pl-2.5"
                                  >
                                    {tf}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </ScrollArea>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-1">
                      <div className="space-y-2">
                        <Label className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          Start Date
                        </Label>
                        <Popover
                          open={isStartDateOpen}
                          onOpenChange={setIsStartDateOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              data-empty={!startDate}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !startDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon />
                              {startDate ? (
                                format(startDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              month={startDate}
                              onSelect={(date) => {
                                setStartDate(date);
                                if (date) {
                                  setIsStartDateOpen(false);
                                }
                              }}
                              disabled={{ after: new Date() }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          End Date
                        </Label>
                        <Popover
                          open={isEndDateOpen}
                          onOpenChange={setIsEndDateOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              data-empty={!endDate}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !endDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon />
                              {endDate ? (
                                format(endDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              month={endDate}
                              onSelect={(date) => {
                                setEndDate(date);
                                if (date) {
                                  setIsEndDateOpen(false);
                                }
                              }}
                              disabled={{ after: new Date() }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        Strategy
                      </Label>
                      <div className="relative">
                        <Dialog
                          open={isStrategyMenuOpen}
                          onOpenChange={(open) => {
                            setIsStrategyMenuOpen(open);
                            if (open) {
                              setStrategyPage(1);
                            }
                            if (!open) {
                              setStrategySearch("");
                              setStrategyPage(1);
                              setIsAppendingStrategies(false);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "relative w-full justify-start overflow-hidden text-left",
                                strategyId ? "pr-28 md:pr-36" : "pr-10",
                                !isLoadingStrategies &&
                                  !selectedStrategy?.name &&
                                  !selectedStrategyName &&
                                  "text-muted-foreground",
                              )}
                              disabled={isLoadingStrategies}
                            >
                              <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                                {isLoadingStrategies
                                  ? "Loading strategies..."
                                  : selectedStrategy?.name ||
                                    selectedStrategyName ||
                                    "Select strategy"}
                              </span>
                              <ChevronsUpDown className="absolute top-1/2 right-3 h-4 w-4 shrink-0 -translate-y-1/2 opacity-50" />
                            </Button>
                          </DialogTrigger>

                          <DialogContent
                            className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 md:top-[10vh] md:max-w-2xl"
                            onOpenAutoFocus={(event) => {
                              event.preventDefault();
                            }}
                          >
                            <DialogHeader className="border-b px-4 pt-4 pb-3">
                              <DialogTitle>Select strategy</DialogTitle>
                              <DialogDescription>
                                Pick the strategy you want to run in this
                                backtest.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 px-4 py-4">
                              <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  ref={strategySearchInputRef}
                                  value={strategySearch}
                                  onChange={(event) => {
                                    setStrategySearch(event.target.value);
                                    setStrategyPage(1);
                                  }}
                                  placeholder="Search"
                                  className="h-9 w-full pr-14 pl-7"
                                />
                                <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="h-6 w-6"
                                    disabled={isLoadingStrategies}
                                    onClick={() => {
                                      setIsAppendingStrategies(false);
                                      setStrategyPage(1);
                                      setStrategyRefreshTick(
                                        (prev) => prev + 1,
                                      );
                                    }}
                                  >
                                    <RefreshCcw
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        isLoadingStrategies && "animate-spin",
                                      )}
                                    />
                                  </Button>
                                  <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="h-6 w-6"
                                      >
                                        <ListFilter className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-52"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                    >
                                      <DropdownMenuLabel>
                                        Sort By
                                      </DropdownMenuLabel>
                                      <DropdownMenuRadioGroup
                                        value={strategySortBy}
                                        onValueChange={(value) => {
                                          const nextSortBy = value as
                                            | "name"
                                            | "createdAt"
                                            | "updatedAt"
                                            | "popular";
                                          setStrategySortBy(nextSortBy);
                                          if (nextSortBy === "popular") {
                                            setStrategyOrder("desc");
                                          }
                                          if (nextSortBy === "name") {
                                            setStrategyOrder("asc");
                                          }
                                          if (
                                            nextSortBy === "createdAt" ||
                                            nextSortBy === "updatedAt"
                                          ) {
                                            setStrategyOrder("desc");
                                          }
                                          setStrategyPage(1);
                                        }}
                                      >
                                        <DropdownMenuRadioItem value="updatedAt">
                                          Last updated
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="name">
                                          Name
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="createdAt">
                                          Newest
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="popular">
                                          Popular
                                        </DropdownMenuRadioItem>
                                      </DropdownMenuRadioGroup>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>
                                        Order
                                      </DropdownMenuLabel>
                                      <DropdownMenuRadioGroup
                                        value={strategyOrder}
                                        onValueChange={(value) => {
                                          setStrategyOrder(
                                            value as "asc" | "desc",
                                          );
                                          setStrategyPage(1);
                                        }}
                                      >
                                        <DropdownMenuRadioItem value="asc">
                                          Asc
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="desc">
                                          Desc
                                        </DropdownMenuRadioItem>
                                      </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  variant={
                                    strategySource === "all" &&
                                    strategyPublicOnly
                                      ? "default"
                                      : "outline"
                                  }
                                  className="h-7 rounded-md px-2.5 text-[11px]"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setStrategySource("all");
                                    setStrategyPublicOnly(true);
                                    setStrategyPage(1);
                                  }}
                                >
                                  All
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    strategySource === "bookmarked"
                                      ? "default"
                                      : "outline"
                                  }
                                  className="h-7 rounded-md px-2.5 text-[11px]"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setStrategySource("bookmarked");
                                    setStrategyPublicOnly(false);
                                    setStrategyPage(1);
                                  }}
                                >
                                  Bookmarked
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    strategySource === "mine"
                                      ? "default"
                                      : "outline"
                                  }
                                  className="h-7 rounded-md px-2.5 text-[11px]"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setStrategySource("mine");
                                    setStrategyPublicOnly(false);
                                    setStrategyPage(1);
                                  }}
                                >
                                  My Strategy
                                </Button>
                              </div>
                            </div>
                            <DropdownMenuSeparator />
                            {strategies.length === 0 ? (
                              <p className="px-4 pb-4 text-xs text-muted-foreground">
                                No strategies found.
                              </p>
                            ) : (
                              <ScrollArea
                                className={cn(
                                  "px-4 pb-4",
                                  strategies.length > 4 && "h-[320px]",
                                )}
                                onScrollCapture={(event) => {
                                  const node = event.target as HTMLElement;
                                  const distanceToBottom =
                                    node.scrollHeight -
                                    node.scrollTop -
                                    node.clientHeight;

                                  if (
                                    distanceToBottom < 24 &&
                                    strategyHasNextPage &&
                                    !isLoadingStrategies &&
                                    !isAppendingStrategies
                                  ) {
                                    setIsAppendingStrategies(true);
                                    setStrategyPage((prev) => prev + 1);
                                  }
                                }}
                              >
                                <div className="space-y-1">
                                  {strategies.map((item) => {
                                    const isSelected = item._id === strategyId;

                                    return (
                                      <div
                                        key={item._id}
                                        role="button"
                                        tabIndex={0}
                                        className={cn(
                                          "flex w-full overflow-hidden rounded-lg border px-3.5 py-2 text-left transition-colors",
                                          isSelected
                                            ? "border-primary/40 bg-muted"
                                            : "border-border/70 bg-muted/40 hover:bg-accent",
                                        )}
                                        onClick={() => {
                                          setStrategyId(item._id);
                                          setSelectedStrategyName(item.name);
                                          setIsStrategyMenuOpen(false);
                                        }}
                                        onKeyDown={(event) => {
                                          if (
                                            event.key !== "Enter" &&
                                            event.key !== " "
                                          ) {
                                            return;
                                          }

                                          event.preventDefault();
                                          setStrategyId(item._id);
                                          setSelectedStrategyName(item.name);
                                          setIsStrategyMenuOpen(false);
                                        }}
                                      >
                                        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-[11px] text-muted-foreground md:items-center">
                                          <span className="min-w-0 overflow-hidden">
                                            <span className="block w-full truncate text-sm font-medium whitespace-nowrap text-foreground">
                                              {item.name}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                              @
                                              {item.user?.username || "unknown"}
                                            </span>
                                          </span>
                                          <span className="inline-flex shrink-0 flex-col items-end gap-1 pr-2 pl-2 md:flex-row md:items-center md:gap-2 md:pr-3">
                                            <span className="inline-flex items-center gap-1">
                                              <TrendingUp className="h-3 w-3" />
                                              {item.stats?.viewCount ?? 0}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                              <button
                                                type="button"
                                                className={cn(
                                                  "inline-flex h-4 w-4 items-center justify-center rounded-sm",
                                                  item.isBookmarked
                                                    ? "text-primary"
                                                    : "text-muted-foreground",
                                                )}
                                                aria-label={
                                                  item.isBookmarked
                                                    ? "Remove bookmark"
                                                    : "Add bookmark"
                                                }
                                                title={
                                                  item.isBookmarked
                                                    ? "Remove bookmark"
                                                    : "Add bookmark"
                                                }
                                                disabled={updatingStrategyIds.has(
                                                  item._id,
                                                )}
                                                onClick={(event) => {
                                                  event.preventDefault();
                                                  event.stopPropagation();
                                                  void onToggleStrategyBookmark(
                                                    item._id,
                                                  );
                                                }}
                                              >
                                                {updatingStrategyIds.has(
                                                  item._id,
                                                ) ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : item.isBookmarked ? (
                                                  <BookmarkCheck className="h-3 w-3" />
                                                ) : (
                                                  <Bookmark className="h-3 w-3" />
                                                )}
                                              </button>
                                              {item.stats?.bookmarkCount ?? 0}
                                            </span>
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {strategyHasNextPage ? (
                                    <div className="flex h-10 items-center justify-center">
                                      {isAppendingStrategies ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                                          <span className="text-sm text-muted-foreground">
                                            Loading...
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </ScrollArea>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={isRunning}
                          onClick={() => {
                            if (isRunning) return;
                            navigate("/strategy", {
                              state: {
                                openStrategyBuilder: true,
                              },
                            });
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={isRunning}
                          asChild
                        >
                          <a
                            href="/strategy"
                            aria-disabled={isRunning}
                            tabIndex={isRunning ? -1 : undefined}
                            onClick={(event) => {
                              if (isRunning) {
                                event.preventDefault();
                              }
                            }}
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5",
                              isRunning && "pointer-events-none opacity-60",
                            )}
                          >
                            <Compass className="h-3.5 w-3.5" />
                            Explore
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-xl border bg-card p-4 lg:p-5">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-foreground">
                      Capital plan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Set wallet size, order sizing, and fees before you run.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="initialBalance"
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                        Initial Balance
                      </Label>
                      <Input
                        id="initialBalance"
                        type="text"
                        inputMode="decimal"
                        value={initialBalance}
                        onChange={(event) =>
                          setInitialBalance(
                            sanitizeNumericInput(event.target.value, true),
                          )
                        }
                        placeholder="10000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="amountPerTrade"
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                        Amount Per Trade
                      </Label>
                      <Input
                        id="amountPerTrade"
                        type="text"
                        inputMode="decimal"
                        value={amountPerTrade}
                        onChange={(event) =>
                          setAmountPerTrade(
                            sanitizeNumericInput(event.target.value, true),
                          )
                        }
                        placeholder="1000"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="entryFeeRate"
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                      >
                        <Percent className="h-3.5 w-3.5 text-primary" />
                        Entry Fee (%)
                      </Label>
                      <Input
                        id="entryFeeRate"
                        type="text"
                        inputMode="decimal"
                        value={entryFeeRate}
                        onChange={(event) =>
                          setEntryFeeRate(
                            sanitizeNumericInput(event.target.value, true),
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="exitFeeRate"
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                      >
                        <Percent className="h-3.5 w-3.5 text-primary" />
                        Exit Fee (%)
                      </Label>
                      <Input
                        id="exitFeeRate"
                        type="text"
                        inputMode="decimal"
                        value={exitFeeRate}
                        onChange={(event) =>
                          setExitFeeRate(
                            sanitizeNumericInput(event.target.value, true),
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4 lg:p-5">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          Execution settings
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Switch how positions behave and review readiness
                          before launch.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-medium">
                            Position Mode
                          </Label>
                        </div>
                        <Toggle
                          pressed={hedgeMode}
                          disabled={isRunning}
                          onPressedChange={setHedgeMode}
                          variant="outline"
                          size="sm"
                          className="inline-flex px-2.5 data-[state=on]:border-primary/40 data-[state=on]:bg-muted data-[state=on]:text-foreground"
                        >
                          {hedgeMode ? (
                            <ArrowLeftRight className="h-4 w-4 text-primary" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-primary" />
                          )}
                          <span className="text-sm">
                            {hedgeMode ? "Hedge" : "One-way"}
                          </span>
                        </Toggle>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          <CircleDollarSign className="h-3 w-3" />
                          Balance {initialBalance || "0"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          <Target className="h-3 w-3" />
                          <span className="max-w-[170px] truncate">
                            {selectedStrategyLabel}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          <Percent className="h-3 w-3" />
                          Fees {entryFeeRate || "0"} / {exitFeeRate || "0"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p>
                          Double-check the symbol, timeframe, and strategy logic
                          before running. This card is ready for fast iteration,
                          but your results still depend on the underlying rules.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full gap-2 rounded-lg"
                      disabled={
                        isRunning ||
                        isLoadingBacktest ||
                        !isSetupReady ||
                        (isEditing && !hasChanges)
                      }
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isRunning
                        ? isEditing
                          ? "Updating Backtest..."
                          : "Running Backtest..."
                        : isEditing
                          ? "Update Backtest"
                          : "Run Backtest"}
                    </Button>
                  </div>
                </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
