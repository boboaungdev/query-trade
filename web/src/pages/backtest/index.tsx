import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import type { DateRange } from "react-day-picker";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  Bitcoin,
  Copy,
  CalendarRange,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  CircleHelp,
  Eye,
  HandCoins,
  Loader2,
  MoreHorizontal,
  Percent,
  Play,
  Bookmark,
  BookmarkCheck,
  Globe,
  Lock,
  Search,
  ShieldAlert,
  ListFilter,
  Sparkles,
  Target,
  UserRound,
  Wallet,
  type LucideIcon,
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
import { ButtonGroup } from "@/components/ui/button-group";
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
  DropdownMenuItem,
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
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
  description?: string;
  isBookmarked?: boolean;
  isPublic?: boolean;
  stats?: {
    viewCount?: number;
    bookmarkCount?: number;
  };
  user?: {
    _id?: string;
    username?: string;
    avatar?: string;
    membership?: UserMembership;
  };
};

type PreselectedStrategyState = {
  strategy?: StrategyItem;
  strategyId?: unknown;
  strategyName?: unknown;
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

const strategySourceOptions: Array<{
  label: string;
  value: StrategySource;
}> = [
  { label: "All", value: "all" },
  { label: "Bookmarked", value: "bookmarked" },
  { label: "My Strategy", value: "mine" },
];

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
const capitalPlanLabelClass = "text-xs font-medium text-muted-foreground";
const defaultInitialBalanceValue = "10000";
const defaultAmountPerTradeValue = "100";
const defaultEntryFeeRateValue = "0.00";
const defaultExitFeeRateValue = "0.00";
const helperPopoverClassName =
  "w-52 rounded-md border-border/60 bg-popover px-3 py-2 text-xs leading-relaxed text-muted-foreground shadow-sm";
const capitalPlanFieldClass = cn(
  "h-8 rounded-lg",
  defaultFieldSurfaceClass,
  disabledFieldSurfaceClass,
);

type CapitalPlanInputProps = {
  id: string;
  label: string;
  ariaLabel: string;
  value: string;
  placeholder: string;
  defaultValue: string;
  icon: LucideIcon;
  onChange: (value: string) => void;
};

function CapitalPlanInput({
  id,
  label,
  ariaLabel,
  value,
  placeholder,
  defaultValue,
  icon: Icon,
  onChange,
}: CapitalPlanInputProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={capitalPlanLabelClass}>
        {label}
      </label>
      <InputGroup className={capitalPlanFieldClass}>
        <InputGroupAddon className="text-muted-foreground">
          <Icon className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            if (!event.target.value.trim()) {
              onChange(defaultValue);
            }
          }}
          placeholder={placeholder}
        />
      </InputGroup>
    </div>
  );
}

type RunSummaryCardProps = {
  symbol: string;
  timeframe: string;
  selectedStrategyLabel: string;
  startDate?: Date;
  endDate?: Date;
  durationLabel: string;
  initialBalance: string;
  amountPerTrade: string;
  entryFeeRate: string;
  exitFeeRate: string;
  hedgeMode: boolean;
  isSetupReady: boolean;
  isRunning: boolean;
  isLoadingBacktest: boolean;
  isEditing: boolean;
  hasChanges: boolean;
  submitFormId?: string;
  bare?: boolean;
  hideHeader?: boolean;
};

function RunSummaryCard({
  symbol,
  timeframe,
  selectedStrategyLabel,
  startDate,
  endDate,
  durationLabel,
  initialBalance,
  amountPerTrade,
  entryFeeRate,
  exitFeeRate,
  hedgeMode,
  isSetupReady,
  isRunning,
  isLoadingBacktest,
  isEditing,
  hasChanges,
  submitFormId,
  bare = false,
  hideHeader = false,
}: RunSummaryCardProps) {
  const isSymbolPlaceholder = !symbol;
  const isTimeframePlaceholder = !timeframe;
  const isStrategyPlaceholder =
    selectedStrategyLabel === "No strategy selected";
  const isStartDatePlaceholder = !startDate;
  const isEndDatePlaceholder = !endDate;
  const isDurationPlaceholder = durationLabel === "-";

  const content = (
    <div className="min-w-0 space-y-4">
      {hideHeader ? null : (
        <div>
          <p className="text-base font-semibold text-foreground">Run summary</p>
          <p className="text-xs text-muted-foreground">
            Review the setup you have added before launching.
          </p>
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex items-start justify-between gap-4 text-sm">
          <p className="text-muted-foreground">Market</p>
          <div className="min-w-0 text-right">
            <p
              className={cn(
                "font-medium",
                isSymbolPlaceholder
                  ? "text-muted-foreground"
                  : "text-foreground",
              )}
            >
              {symbol || "Select symbol"}
            </p>
            <p
              className={cn(
                "text-xs",
                isTimeframePlaceholder
                  ? "text-muted-foreground"
                  : "text-foreground",
              )}
            >
              {timeframe || "Select timeframe"}
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 text-sm">
          <p className="text-muted-foreground">Strategy</p>
          <p
            className={cn(
              "min-w-0 max-w-[180px] break-words text-right font-medium",
              isStrategyPlaceholder
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {selectedStrategyLabel}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">Start Date</p>
          <p
            className={cn(
              "text-right font-medium",
              isStartDatePlaceholder
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {startDate ? format(startDate, "PPP") : "Pick a date"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">End Date</p>
          <p
            className={cn(
              "text-right font-medium",
              isEndDatePlaceholder
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {endDate ? format(endDate, "PPP") : "Pick a date"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">Duration</p>
          <p
            className={cn(
              "text-right font-medium",
              isDurationPlaceholder
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {durationLabel}
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
        <div>
          <p>
            Review your setup before running. Results will vary based on your
            strategy rules and the available market data.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        form={submitFormId}
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
          <>
            <Play className="h-4 w-4" />
            {isEditing ? "Update Backtest" : "Run Backtest"}
          </>
        )}
      </Button>
    </div>
  );

  if (bare) {
    return content;
  }

  return (
    <Card className="min-w-0 border-border/70 text-sm">
      <CardContent className="min-w-0 space-y-4">{content}</CardContent>
    </Card>
  );
}

export default function BacktestPage() {
  const { backtestId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isEditing = Boolean(backtestId);
  const backtestFormId = "backtest-run-form";

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
  const [debouncedStrategySearch, setDebouncedStrategySearch] = useState("");
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
  const previousStrategySearchRef = useRef(strategySearch.trim());
  const hasLoadedStrategiesRef = useRef(false);
  const [isSearchingStrategies, setIsSearchingStrategies] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date("2025-01-01T00:00:00Z"),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date("2025-03-01T00:00:00Z"),
  );
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState(
    defaultInitialBalanceValue,
  );
  const [amountPerTrade, setAmountPerTrade] = useState(
    defaultAmountPerTradeValue,
  );
  const [entryFeeRate, setEntryFeeRate] = useState(defaultEntryFeeRateValue);
  const [exitFeeRate, setExitFeeRate] = useState(defaultExitFeeRateValue);
  const [hedgeMode, setHedgeMode] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);

  const [isLoadingExchange, setIsLoadingExchange] = useState(true);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingBacktest, setIsLoadingBacktest] = useState(isEditing);
  const [isRunning, setIsRunning] = useState(false);
  const [exchangeRefreshTick] = useState(0);
  const [hasHydratedFromBacktest, setHasHydratedFromBacktest] = useState(false);
  const [initialSnapshot, setInitialSnapshot] =
    useState<BacktestDraftSnapshot | null>(null);
  const [updatingStrategyIds, setUpdatingStrategyIds] = useState<Set<string>>(
    new Set(),
  );
  const locationState =
    typeof location.state === "object" && location.state !== null
      ? (location.state as PreselectedStrategyState)
      : null;
  const preselectedStrategy =
    locationState?.strategy &&
    typeof locationState.strategy._id === "string" &&
    typeof locationState.strategy.name === "string"
      ? locationState.strategy
      : null;
  const preselectedStrategyId =
    typeof locationState?.strategyId === "string"
      ? locationState.strategyId
      : preselectedStrategy?._id
        ? preselectedStrategy._id
        : "";
  const preselectedStrategyName =
    typeof locationState?.strategyName === "string"
      ? locationState.strategyName
      : preselectedStrategy?.name
        ? preselectedStrategy.name
        : "";

  useEffect(() => {
    strategyIdRef.current = strategyId;
  }, [strategyId]);

  useEffect(() => {
    if (isEditing) return;
    if (!preselectedStrategyId) return;

    setStrategyId(preselectedStrategyId);
    setSelectedStrategyName(preselectedStrategyName);

    if (preselectedStrategy) {
      setStrategies((prev) =>
        prev.some((item) => item._id === preselectedStrategy._id)
          ? prev
          : [preselectedStrategy, ...prev],
      );
    }
  }, [
    isEditing,
    preselectedStrategy,
    preselectedStrategyId,
    preselectedStrategyName,
  ]);

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
      setDebouncedStrategySearch(strategySearch.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [strategySearch]);

  useEffect(() => {
    const loadStrategiesPage = async () => {
      const isInitialStrategiesLoad = !hasLoadedStrategiesRef.current;
      const isSearchTriggeredFetch =
        debouncedStrategySearch !== previousStrategySearchRef.current;
      const isAppendFetch = strategyPage > 1;

      if (isSearchTriggeredFetch) {
        setIsSearchingStrategies(true);
      } else if (!isAppendFetch) {
        setIsLoadingStrategies(true);
      }

      try {
        const queryKey = [
          "strategies",
          strategyPage,
          12,
          debouncedStrategySearch,
          strategySortBy,
          strategyOrder,
          strategySource,
          strategyPublicOnly,
        ].join(":");

        const response = (await dedupeRequest(queryKey, () =>
          fetchStrategies({
            page: strategyPage,
            search: debouncedStrategySearch,
            sortBy: strategySortBy,
            order: strategyOrder,
            source: strategySource,
            isPublic: strategySource === "all" ? strategyPublicOnly : undefined,
          }),
        )) as StrategyListResponse;

        const result = response?.result;
        const pageItems = result?.strategies ?? result?.indicators ?? [];
        setStrategies((prev) => {
          if (strategyPage === 1) {
            if (
              preselectedStrategy &&
              !pageItems.some((item) => item._id === preselectedStrategy._id)
            ) {
              return [preselectedStrategy, ...pageItems];
            }

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

        hasLoadedStrategiesRef.current = true;
        previousStrategySearchRef.current = debouncedStrategySearch;
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to fetch strategies"));
        setIsAppendingStrategies(false);
      } finally {
        if (isSearchTriggeredFetch) {
          setIsSearchingStrategies(false);
        } else if (!isAppendFetch || isInitialStrategiesLoad) {
          setIsLoadingStrategies(false);
        }
      }
    };

    void loadStrategiesPage();
  }, [
    debouncedStrategySearch,
    preselectedStrategy,
    strategyOrder,
    strategyPage,
    strategyPublicOnly,
    strategySortBy,
    strategySource,
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

  const isStrategySearchPending =
    strategySearch.trim() !== debouncedStrategySearch;
  const strategyStatus =
    isStrategySearchPending || isSearchingStrategies
      ? "searching"
      : isLoadingStrategies
        ? "loading"
        : null;

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
  const firstVisibleStrategy = strategies[0];
  const currentStartDateIso = startDate ? toUtcStartOfDayIso(startDate) : "";
  const currentEndDateIso = endDate ? toUtcStartOfDayIso(endDate) : "";
  const durationLabel =
    startDate && endDate
      ? `${Math.max(
          1,
          Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000),
        )} days`
      : "-";
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

  const onCopyStrategyLink = async (strategyIdToCopy: string) => {
    const strategyUrl = `${window.location.origin}/strategy/${strategyIdToCopy}`;

    try {
      await navigator.clipboard.writeText(strategyUrl);
      toast.success("Link copied");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy link"));
    }
  };

  const selectStrategy = (item: StrategyItem) => {
    setStrategyId(item._id);
    setSelectedStrategyName(item.name);
    setIsStrategyMenuOpen(false);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedInitialBalance = Number(
      initialBalance.trim() || defaultInitialBalanceValue,
    );
    const parsedAmountPerTrade = Number(
      amountPerTrade.trim() || defaultAmountPerTradeValue,
    );
    const parsedEntryFee = Number(
      entryFeeRate.trim() || defaultEntryFeeRateValue,
    );
    const parsedExitFee = Number(exitFeeRate.trim() || defaultExitFeeRateValue);

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
              <CardTitle className="text-lg tracking-tight md:text-xl">
                {isEditing ? "Update this backtest" : "Create a backtest run"}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {isEditing
                  ? "Adjust the market, strategy, and capital settings, then save your changes to this backtest result."
                  : "Choose your market, strategy, and capital settings."}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <form id={backtestFormId} onSubmit={onSubmit} className="mt-4 md:mt-6">
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
                          Market setup
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Choose the pair, timeframe, and backtest range.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className={capitalPlanLabelClass}>Symbol</label>
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

                      <div className="space-y-1">
                        <label className={capitalPlanLabelClass}>
                          Timeframe
                        </label>
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

                      <div className="min-w-0 space-y-1">
                        <div className="space-y-1">
                          <label className={capitalPlanLabelClass}>
                            Date range
                          </label>
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
                      <div className="min-w-0 space-y-1">
                        <label className={capitalPlanLabelClass}>
                          Strategy
                        </label>
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
                                  "relative w-full justify-start overflow-hidden pr-0 pl-9 text-left",
                                  disabledFieldSurfaceClass,
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
                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                  <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      ref={strategySearchInputRef}
                                      value={strategySearch}
                                      onChange={(event) => {
                                        setStrategySearch(event.target.value);
                                        setStrategyPage(1);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key !== "Enter") {
                                          return;
                                        }

                                        if (!firstVisibleStrategy) {
                                          return;
                                        }

                                        event.preventDefault();
                                        selectStrategy(firstVisibleStrategy);
                                      }}
                                      aria-label="Search strategy"
                                      placeholder="Search strategy"
                                      className={cn(
                                        "rounded-md border-0 border-b-2 border-foreground/15 pr-10 pl-9 focus-visible:border-primary focus-visible:ring-0",
                                        defaultFieldSurfaceClass,
                                      )}
                                    />
                                    <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5">
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
                                  <div className="flex w-full md:w-[180px] md:flex-none">
                                    <DropdownMenu modal={false}>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="h-8 w-full justify-between gap-2"
                                        >
                                          {
                                            strategySourceOptions.find(
                                              (option) =>
                                                option.value === strategySource,
                                            )?.label
                                          }
                                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="start"
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                      >
                                        <DropdownMenuLabel>
                                          Category
                                        </DropdownMenuLabel>
                                        <DropdownMenuRadioGroup
                                          value={strategySource}
                                          onValueChange={(value) => {
                                            const nextSource =
                                              value as StrategySource;
                                            setStrategySource(nextSource);
                                            setStrategyPublicOnly(
                                              nextSource === "all",
                                            );
                                            setStrategyPage(1);
                                          }}
                                        >
                                          {strategySourceOptions.map(
                                            (option) => (
                                              <DropdownMenuRadioItem
                                                key={option.value}
                                                value={option.value}
                                              >
                                                {option.label}
                                              </DropdownMenuRadioItem>
                                            ),
                                          )}
                                        </DropdownMenuRadioGroup>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                              <div className="border-t" />
                              {strategyStatus ? (
                                <div className="flex items-center justify-center gap-2 px-4 pt-3 pb-4 text-sm text-muted-foreground">
                                  {strategyStatus === "searching" ? (
                                    <>
                                      <Search className="h-4 w-4 animate-pulse" />
                                      <span>Searching strategy....</span>
                                    </>
                                  ) : (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>Loading strategy....</span>
                                    </>
                                  )}
                                </div>
                              ) : null}
                              {!strategyStatus && strategies.length === 0 ? (
                                <p className="flex items-center justify-center px-4 pt-3 pb-4 text-sm text-muted-foreground">
                                  No strategies found.
                                </p>
                              ) : !strategyStatus && strategies.length > 0 ? (
                                <Command
                                  shouldFilter={false}
                                  className="rounded-none bg-transparent p-0"
                                >
                                  <ScrollArea
                                    className="h-[320px] px-4 py-3"
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
                                    <CommandList className="max-h-none overflow-visible px-0 py-0">
                                      <CommandGroup className="space-y-1 p-0">
                                        {strategies.map((item) => {
                                          const isSelected =
                                            item._id === strategyId;

                                          return (
                                            <CommandItem
                                              key={item._id}
                                              value={item._id}
                                              className={cn(
                                                "theme-hover-surface flex min-w-0 overflow-hidden cursor-pointer items-center justify-between gap-3 rounded-md py-2 pl-3 pr-0 text-left hover:bg-muted/60 data-[selected=true]:bg-transparent data-[selected=true]:hover:bg-muted/60",
                                                isSelected &&
                                                  "bg-muted text-foreground",
                                              )}
                                              onSelect={() =>
                                                selectStrategy(item)
                                              }
                                            >
                                              <div className="w-0 min-w-0 flex-1 overflow-hidden">
                                                <p className="block w-full truncate font-medium">
                                                  {item.name}
                                                </p>
                                                <p className="block w-full truncate text-xs text-muted-foreground">
                                                  {item.description?.trim() ||
                                                    "No description provided."}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                    <UserRound className="h-3.5 w-3.5" />
                                                    <span className="inline-flex min-w-0 items-center gap-1">
                                                      <span className="truncate">
                                                        @
                                                        {item.user?.username ||
                                                          "unknown"}
                                                      </span>
                                                      <UserMembershipMark
                                                        membership={
                                                          item.user?.membership
                                                        }
                                                        className="size-3"
                                                      />
                                                    </span>
                                                  </span>
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                    {item.isPublic ? (
                                                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                                    ) : (
                                                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    )}
                                                    {item.isPublic
                                                      ? "Public"
                                                      : "Private"}
                                                  </span>
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                    <Eye className="h-3.5 w-3.5" />
                                                    {item.stats?.viewCount ?? 0}
                                                  </span>
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                    <Bookmark className="h-3.5 w-3.5" />
                                                    {item.stats
                                                      ?.bookmarkCount ?? 0}
                                                  </span>
                                                </div>
                                              </div>
                                              <ButtonGroup
                                                aria-label={`Bookmark actions for ${item.name || "strategy"}`}
                                                className="min-w-0 shrink-0"
                                              >
                                                <Button
                                                  type="button"
                                                  size="icon-sm"
                                                  variant="ghost"
                                                  className={cn(
                                                    "rounded-r-none border-transparent shadow-none",
                                                    item.isBookmarked
                                                      ? "text-primary"
                                                      : "text-muted-foreground",
                                                  )}
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
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : item.isBookmarked ? (
                                                    <BookmarkCheck className="h-4 w-4" />
                                                  ) : (
                                                    <Bookmark className="h-4 w-4" />
                                                  )}
                                                </Button>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button
                                                      type="button"
                                                      size="icon-sm"
                                                      variant="ghost"
                                                      className="-ml-px rounded-l-none border-transparent text-muted-foreground shadow-none"
                                                      aria-label={`More actions for ${item.name || "strategy"}`}
                                                      onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                      }}
                                                    >
                                                      <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent
                                                    align="end"
                                                    collisionPadding={16}
                                                    className="w-44"
                                                    onClick={(event) =>
                                                      event.stopPropagation()
                                                    }
                                                  >
                                                    <DropdownMenuItem
                                                      onClick={() =>
                                                        void onCopyStrategyLink(
                                                          item._id,
                                                        )
                                                      }
                                                    >
                                                      <Copy className="h-4 w-4" />
                                                      Copy link
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                      disabled={updatingStrategyIds.has(
                                                        item._id,
                                                      )}
                                                      onClick={() => {
                                                        void onToggleStrategyBookmark(
                                                          item._id,
                                                        );
                                                      }}
                                                    >
                                                      {item.isBookmarked ? (
                                                        <>
                                                          <BookmarkCheck className="h-4 w-4" />
                                                          Bookmarked
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Bookmark className="h-4 w-4" />
                                                          Bookmark
                                                        </>
                                                      )}
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </ButtonGroup>
                                            </CommandItem>
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
                                      </CommandGroup>
                                    </CommandList>
                                  </ScrollArea>
                                </Command>
                              ) : null}
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
                      <CapitalPlanInput
                        id="initialBalance"
                        label="Initial balance"
                        ariaLabel="Initial balance"
                        value={initialBalance}
                        placeholder={defaultInitialBalanceValue}
                        defaultValue={defaultInitialBalanceValue}
                        icon={Wallet}
                        onChange={(value) =>
                          setInitialBalance(sanitizeNumericInput(value, true))
                        }
                      />

                      <CapitalPlanInput
                        id="amountPerTrade"
                        label="Amount per trade"
                        ariaLabel="Amount per trade"
                        value={amountPerTrade}
                        placeholder={defaultAmountPerTradeValue}
                        defaultValue={defaultAmountPerTradeValue}
                        icon={HandCoins}
                        onChange={(value) =>
                          setAmountPerTrade(sanitizeNumericInput(value, true))
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <CapitalPlanInput
                        id="entryFeeRate"
                        label="Entry fee rate (%)"
                        ariaLabel="Entry fee percentage"
                        value={entryFeeRate}
                        placeholder={defaultEntryFeeRateValue}
                        defaultValue={defaultEntryFeeRateValue}
                        icon={Percent}
                        onChange={(value) =>
                          setEntryFeeRate(sanitizeNumericInput(value, true))
                        }
                      />

                      <CapitalPlanInput
                        id="exitFeeRate"
                        label="Exit fee rate (%)"
                        ariaLabel="Exit fee percentage"
                        value={exitFeeRate}
                        placeholder={defaultExitFeeRateValue}
                        defaultValue={defaultExitFeeRateValue}
                        icon={Percent}
                        onChange={(value) =>
                          setExitFeeRate(sanitizeNumericInput(value, true))
                        }
                      />
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
                        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <label className={capitalPlanLabelClass}>
                                Position mode
                              </label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label="Learn about position mode"
                                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                  >
                                    <CircleHelp className="h-3 w-3" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  side="top"
                                  align="start"
                                  sideOffset={8}
                                  className={helperPopoverClassName}
                                >
                                  <div className="space-y-1">
                                    <p>
                                      <span className="font-semibold text-foreground">
                                        One-way
                                      </span>
                                      {" - "}
                                      keeps a single net position per market.
                                    </p>
                                    <p>
                                      <span className="font-semibold text-foreground">
                                        Hedge
                                      </span>
                                      {" - "}
                                      lets long and short positions exist at the
                                      same time.
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
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
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      className="w-full gap-2 rounded-lg md:hidden"
                    >
                      <Eye className="h-4 w-4" />
                      Show summary
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg md:hidden">
                    <DialogHeader className="border-b px-4 pt-4 pb-3">
                      <DialogTitle>Run summary</DialogTitle>
                      <DialogDescription>
                        Review your setup before launching the backtest.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4">
                      <RunSummaryCard
                        symbol={symbol}
                        timeframe={timeframe}
                        selectedStrategyLabel={selectedStrategyLabel}
                        startDate={startDate}
                        endDate={endDate}
                        durationLabel={durationLabel}
                        initialBalance={initialBalance}
                        amountPerTrade={amountPerTrade}
                        entryFeeRate={entryFeeRate}
                        exitFeeRate={exitFeeRate}
                        hedgeMode={hedgeMode}
                        isSetupReady={isSetupReady}
                        isRunning={isRunning}
                        isLoadingBacktest={isLoadingBacktest}
                        isEditing={isEditing}
                        hasChanges={hasChanges}
                        submitFormId={backtestFormId}
                        bare
                        hideHeader
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="hidden md:sticky md:top-6 md:block">
                <RunSummaryCard
                  symbol={symbol}
                  timeframe={timeframe}
                  selectedStrategyLabel={selectedStrategyLabel}
                  startDate={startDate}
                  endDate={endDate}
                  durationLabel={durationLabel}
                  initialBalance={initialBalance}
                  amountPerTrade={amountPerTrade}
                  entryFeeRate={entryFeeRate}
                  exitFeeRate={exitFeeRate}
                  hedgeMode={hedgeMode}
                  isSetupReady={isSetupReady}
                  isRunning={isRunning}
                  isLoadingBacktest={isLoadingBacktest}
                  isEditing={isEditing}
                  hasChanges={hasChanges}
                  submitFormId={backtestFormId}
                />
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
