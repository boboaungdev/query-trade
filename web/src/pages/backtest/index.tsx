import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import type { DateRange } from "react-day-picker";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  Bitcoin,
  CalendarRange,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  HandCoins,
  Loader2,
  Percent,
  Play,
  Bookmark,
  BookmarkCheck,
  RefreshCcw,
  Search,
  ShieldAlert,
  ListFilter,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
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
import { fetchStrategies, type StrategySource } from "@/api/strategy";

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

const disabledFieldSurfaceClass =
  "disabled:bg-input/50 dark:disabled:bg-input/80";
const defaultFieldSurfaceClass = "bg-background";

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
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState("10000");
  const [amountPerTrade, setAmountPerTrade] = useState("100");
  const [entryFeeRate, setEntryFeeRate] = useState("0.00");
  const [exitFeeRate, setExitFeeRate] = useState("0.00");
  const [hedgeMode, setHedgeMode] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);

  const [isLoadingExchange, setIsLoadingExchange] = useState(true);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingBacktest, setIsLoadingBacktest] = useState(isEditing);
  const [isRunning, setIsRunning] = useState(false);
  const [exchangeRefreshTick] = useState(0);
  const [strategyRefreshTick, setStrategyRefreshTick] = useState(0);
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
      } catch (error) {
        setStrategies([]);
        setStrategyHasNextPage(false);
        toast.error(
          getApiErrorMessage(error, "Failed to fetch exchange data"),
          {
            id: "backtest-exchange-fetch-error",
          },
        );
      } finally {
        setIsLoadingExchange(false);
      }
    };

    void loadExchangeData();
  }, [exchange, exchangeRefreshTick, hasHydratedFromBacktest, isEditing]);

  useEffect(() => {
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
  const selectedDateRange = useMemo<DateRange | undefined>(() => {
    if (!startDate && !endDate) {
      return undefined;
    }

    return {
      from: startDate,
      to: endDate,
    };
  }, [endDate, startDate]);
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
        <Card className="min-w-0 border-border/70 text-sm">
          <CardHeader>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  Backtest Setup
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground uppercase">
                  {isEditing ? "Editing" : "New Run"}
                </span>
              </div>
              <CardTitle className="text-xl tracking-tight md:text-2xl">
                {isEditing
                  ? "Refine this saved backtest"
                  : "Create a backtest run"}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {isEditing
                  ? "Adjust the market, strategy, and capital settings, then save the updated simulation back into the same result flow."
                  : "Choose your market, strategy, and capital settings."}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <form onSubmit={onSubmit} className="mt-4 md:mt-6">
          <fieldset
            disabled={isRunning || isLoadingBacktest}
            className="min-w-0 space-y-4 border-0 p-0"
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
              <div className="min-w-0 space-y-4">
                <Card className="min-w-0 border-border/70 text-sm">
                  <CardContent className="min-w-0 space-y-4">
                    <div>
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          Market & timing
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Choose the pair, candle interval, and historical
                          range.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
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
                                "relative w-full justify-start overflow-hidden pr-10 pl-9 text-left",
                                disabledFieldSurfaceClass,
                                !isLoadingExchange &&
                                  !symbol &&
                                  "text-muted-foreground",
                              )}
                              disabled={isLoadingExchange}
                            >
                              <Bitcoin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 shrink-0 -translate-y-1/2 text-muted-foreground" />
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
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  value={symbolSearch}
                                  onChange={(event) =>
                                    setSymbolSearch(event.target.value)
                                  }
                                  aria-label="Search symbol"
                                  placeholder="Search symbol"
                                  className={cn(
                                    "rounded-md border-0 border-b-2 border-foreground/15 pr-10 pl-9 focus-visible:border-primary focus-visible:ring-0",
                                    defaultFieldSurfaceClass,
                                  )}
                                />
                              </div>
                            </div>
                            <div className="border-t" />
                            {visibleSymbols.length === 0 ? (
                              <p className="px-4 pb-4 text-xs text-muted-foreground">
                                No symbols found.
                              </p>
                            ) : (
                              <Command
                                shouldFilter={false}
                                className="rounded-none bg-transparent p-0"
                              >
                                <CommandList className="max-h-none overflow-hidden px-0 py-0">
                                  <ScrollArea
                                    className="h-[320px]"
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
                                        setVisibleSymbolCount(
                                          (prev) => prev + 20,
                                        );
                                      }
                                    }}
                                  >
                                    <div className="px-4 py-3">
                                      <CommandGroup className="p-0">
                                        {visibleSymbols.map((item) => (
                                          <CommandItem
                                            key={item}
                                            value={item}
                                            className={cn(
                                              "rounded-md px-3 py-2 text-sm",
                                              item === symbol &&
                                                "bg-muted text-foreground",
                                            )}
                                            onSelect={() => {
                                              setSymbol(item);
                                              setIsSymbolMenuOpen(false);
                                            }}
                                          >
                                            {item}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </div>
                                  </ScrollArea>
                                </CommandList>
                              </Command>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="space-y-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "relative w-full justify-between pl-9",
                                disabledFieldSurfaceClass,
                                !timeframe && "text-muted-foreground",
                              )}
                              disabled={isLoadingExchange}
                            >
                              <Clock3 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 shrink-0 -translate-y-1/2 text-muted-foreground" />
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
                              <ScrollArea className="h-[156px]">
                                <DropdownMenuRadioGroup
                                  value={timeframe}
                                  onValueChange={setTimeframe}
                                >
                                  {timeframeOptions.map((tf) => (
                                    <DropdownMenuRadioItem
                                      key={tf}
                                      value={tf}
                                      className="min-h-8 py-0.5 pl-2.5"
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

                      <div className="min-w-0 space-y-2">
                        <div className="space-y-2">
                          <Popover
                            open={isDateRangeOpen}
                            onOpenChange={setIsDateRangeOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                data-empty={!selectedDateRange?.from}
                                className={cn(
                                  "relative w-full justify-start pl-9 text-left font-normal",
                                  disabledFieldSurfaceClass,
                                  !selectedDateRange?.from &&
                                    "text-muted-foreground",
                                )}
                              >
                                <CalendarRange className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 shrink-0 -translate-y-1/2 text-muted-foreground" />
                                {selectedDateRange?.from ? (
                                  selectedDateRange.to ? (
                                    <>
                                      {format(
                                        selectedDateRange.from,
                                        "LLL dd, y",
                                      )}{" "}
                                      -{" "}
                                      {format(
                                        selectedDateRange.to,
                                        "LLL dd, y",
                                      )}
                                    </>
                                  ) : (
                                    format(selectedDateRange.from, "LLL dd, y")
                                  )
                                ) : (
                                  <span>Pick a date range</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="range"
                                defaultMonth={selectedDateRange?.from}
                                selected={selectedDateRange}
                                onSelect={(range) => {
                                  setStartDate(range?.from);
                                  setEndDate(range?.to);
                                  if (range?.from && range?.to) {
                                    setIsDateRangeOpen(false);
                                  }
                                }}
                                disabled={{ after: new Date() }}
                                numberOfMonths={2}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-2">
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
                                  "relative w-full justify-start overflow-hidden pl-9 text-left",
                                  disabledFieldSurfaceClass,
                                  strategyId ? "pr-28 md:pr-36" : "pr-10",
                                  !isLoadingStrategies &&
                                    !selectedStrategy?.name &&
                                    !selectedStrategyName &&
                                    "text-muted-foreground",
                                )}
                                disabled={isLoadingStrategies}
                              >
                                <Target className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 shrink-0 -translate-y-1/2 text-muted-foreground" />
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
                                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    ref={strategySearchInputRef}
                                    value={strategySearch}
                                    onChange={(event) => {
                                      setStrategySearch(event.target.value);
                                      setStrategyPage(1);
                                    }}
                                    aria-label="Search strategy"
                                    placeholder="Search"
                                    className={cn(
                                      "h-9 w-full pr-14 pl-9",
                                      defaultFieldSurfaceClass,
                                    )}
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
                                      const isSelected =
                                        item._id === strategyId;

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
                                                {item.user?.username ||
                                                  "unknown"}
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
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 overflow-hidden border-border/70 text-sm">
                  <CardContent className="min-w-0 space-y-4">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Capital plan
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Set wallet size, order sizing, and fees before you run.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="initialBalance"
                          className="text-xs font-medium text-foreground"
                        >
                          Initial balance
                        </label>
                        <div className="relative">
                          <Wallet className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="initialBalance"
                            type="text"
                            inputMode="decimal"
                            aria-label="Initial balance"
                            value={initialBalance}
                            onChange={(event) =>
                              setInitialBalance(
                                sanitizeNumericInput(event.target.value, true),
                              )
                            }
                            placeholder="10000"
                            className={cn("pl-9", defaultFieldSurfaceClass)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="amountPerTrade"
                          className="text-xs font-medium text-foreground"
                        >
                          Amount per trade
                        </label>
                        <div className="relative">
                          <HandCoins className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="amountPerTrade"
                            type="text"
                            inputMode="decimal"
                            aria-label="Amount per trade"
                            value={amountPerTrade}
                            onChange={(event) =>
                              setAmountPerTrade(
                                sanitizeNumericInput(event.target.value, true),
                              )
                            }
                            placeholder="1000"
                            className={cn("pl-9", defaultFieldSurfaceClass)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="entryFeeRate"
                          className="text-xs font-medium text-foreground"
                        >
                          Entry fee rate (%)
                        </label>
                        <div className="relative">
                          <Percent className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="entryFeeRate"
                            type="text"
                            inputMode="decimal"
                            aria-label="Entry fee percentage"
                            value={entryFeeRate}
                            onChange={(event) =>
                              setEntryFeeRate(
                                sanitizeNumericInput(event.target.value, true),
                              )
                            }
                            placeholder="0.00"
                            className={cn("pl-9", defaultFieldSurfaceClass)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="exitFeeRate"
                          className="text-xs font-medium text-foreground"
                        >
                          Exit fee rate (%)
                        </label>
                        <div className="relative">
                          <Percent className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="exitFeeRate"
                            type="text"
                            inputMode="decimal"
                            aria-label="Exit fee percentage"
                            value={exitFeeRate}
                            onChange={(event) =>
                              setExitFeeRate(
                                sanitizeNumericInput(event.target.value, true),
                              )
                            }
                            placeholder="0.00"
                            className={cn("pl-9", defaultFieldSurfaceClass)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 border-border/70 text-sm">
                  <CardContent className="min-w-0">
                    <Collapsible
                      open={isAdvancedOptionsOpen}
                      onOpenChange={setIsAdvancedOptionsOpen}
                      className="space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            Advanced options
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Optional controls for how positions behave during
                            the backtest run.
                          </p>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                          >
                            {isAdvancedOptionsOpen ? "Hide" : "Show"}
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                isAdvancedOptionsOpen && "rotate-180",
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                        <div className="rounded-xl border bg-muted/30 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">
                              Position mode
                            </p>
                            <ToggleGroup
                              type="single"
                              value={hedgeMode ? "hedge" : "one-way"}
                              disabled={isRunning}
                              onValueChange={(value) => {
                                if (value === "one-way") {
                                  setHedgeMode(false);
                                } else if (value === "hedge") {
                                  setHedgeMode(true);
                                }
                              }}
                              className={cn(
                                "inline-flex gap-0 overflow-hidden rounded-md border border-border/70 bg-background",
                                (isRunning || isLoadingBacktest) &&
                                  "bg-input/50 dark:bg-input/80",
                              )}
                            >
                              <ToggleGroupItem
                                value="one-way"
                                variant="outline"
                                size="sm"
                                aria-label="One-way mode"
                                className={cn(
                                  "h-7 rounded-none border-0 border-r border-border/70 bg-transparent px-2 text-[11px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                                  disabledFieldSurfaceClass,
                                )}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <ArrowRight className="h-3 w-3" />
                                  <span>One-way</span>
                                </span>
                              </ToggleGroupItem>

                              <ToggleGroupItem
                                value="hedge"
                                variant="outline"
                                size="sm"
                                aria-label="Hedge mode"
                                className={cn(
                                  "h-7 rounded-none border-0 bg-transparent px-2 text-[11px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                                  disabledFieldSurfaceClass,
                                )}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <ArrowLeftRight className="h-3 w-3" />
                                  <span>Hedge</span>
                                </span>
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              </div>

              <Card className="min-w-0 border-border/70 text-sm md:sticky md:top-6">
                <CardContent className="min-w-0 space-y-4">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      Run summary
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Review the setup you have added before launching.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Market</p>
                      <div className="min-w-0 text-right">
                        <p className="font-medium text-foreground">
                          {symbol || "Select symbol"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeframe || "Select timeframe"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Strategy</p>
                      <p className="min-w-0 max-w-[180px] break-words text-right font-medium text-foreground">
                        {selectedStrategyLabel}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="text-right font-medium text-foreground">
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">End Date</p>
                      <p className="text-right font-medium text-foreground">
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Duration</p>
                      <p className="text-right font-medium text-foreground">
                        {startDate && endDate
                          ? `${Math.max(
                              1,
                              Math.ceil(
                                (endDate.getTime() - startDate.getTime()) /
                                  86400000,
                              ),
                            )} days`
                          : "-"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Balance</p>
                      <p className="text-right font-medium text-foreground">
                        ${initialBalance || "0"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Per Trade</p>
                      <p className="text-right font-medium text-foreground">
                        ${amountPerTrade || "0"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Entry Fee</p>
                      <p className="text-right font-medium text-foreground">
                        {entryFeeRate || "0"}%
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Exit Fee</p>
                      <p className="text-right font-medium text-foreground">
                        {exitFeeRate || "0"}%
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <p className="text-muted-foreground">Position Mode</p>
                      <p className="text-right font-medium text-foreground">
                        {hedgeMode ? "Hedge" : "One-way"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                    {isSetupReady
                      ? "Setup looks ready to run."
                      : "Complete the required fields to enable the backtest run."}
                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p>
                      Double-check the symbol, timeframe, and strategy logic
                      before running. Results still depend on the underlying
                      rules and market data.
                    </p>
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
                </CardContent>
              </Card>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
