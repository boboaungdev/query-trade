import { useEffect, useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { format } from "date-fns"
import {
  Activity,
  BarChart3,
  Bolt,
  CalendarIcon,
  Check,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Loader2,
  Play,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"

import {
  exchangeSupportedData,
  runBacktest,
  type BacktestResult,
} from "@/api/backtest"
import { getIndicators, type IndicatorRecord } from "@/api/indicator"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type TopLevelForm = {
  exchange: string
  symbol: string
  timeframe: string
  startTime: Date | undefined
  endTime: Date | undefined
  initialBalance: string
  amountPerTrade: string
  marketType: string
  entryOrderType: string
  exitOrderType: string
}

type IndicatorConfig = {
  id: string
  name: string
  source: string
  period: string
  fastPeriod: string
  slowPeriod: string
  signalPeriod: string
  stdDev: string
}

type ConditionConfig = {
  id: string
  left: string
  operator: string
  rightMode: "indicator" | "value"
  rightIndicator: string
  rightValue: string
}

type RuleGroup = {
  logic: string
  conditions: ConditionConfig[]
}

type StrategyBuilderState = {
  indicators: IndicatorConfig[]
  entryBuy: RuleGroup
  entrySell: RuleGroup
  exitBuy: RuleGroup
  exitSell: RuleGroup
}

type Option = {
  label: string
  value: string
}

type MenuSelectProps = {
  label: string
  value: string
  placeholder: string
  options: Option[]
  disabled?: boolean
  onChange: (value: string) => void
}

type SearchSelectProps = {
  value: string
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  options: Option[]
  disabled?: boolean
  onChange: (value: string) => void
}

type IndicatorDefaults = Partial<
  Pick<
    IndicatorConfig,
    | "source"
    | "period"
    | "fastPeriod"
    | "slowPeriod"
    | "signalPeriod"
    | "stdDev"
  >
>

const RUN_TOAST_ID = "backtest-run"

const exchangeOptions = [
  { label: "Binance", value: "binance" },
  { label: "Bybit", value: "bybit" },
  { label: "OKX", value: "okx" },
  { label: "Bitget", value: "bitget" },
]

const marketTypeOptions = [
  { label: "Spot", value: "spot" },
  { label: "Futures", value: "future" },
]

const orderTypeOptions = [
  { label: "Market", value: "market" },
  { label: "Limit", value: "limit" },
]

const logicOptions = [
  { label: "AND", value: "and" },
  { label: "OR", value: "or" },
]

const operatorOptions = [
  { label: ">", value: ">" },
  { label: ">=", value: ">=" },
  { label: "<", value: "<" },
  { label: "<=", value: "<=" },
  { label: "==", value: "==" },
  { label: "!=", value: "!=" },
]

const sourceOptions = [
  { label: "Close", value: "close" },
  { label: "Open", value: "open" },
  { label: "High", value: "high" },
  { label: "Low", value: "low" },
]

const initialTopLevelForm: TopLevelForm = {
  exchange: "",
  symbol: "",
  timeframe: "",
  startTime: new Date("2026-02-01T00:00:00"),
  endTime: new Date("2026-03-01T00:00:00"),
  initialBalance: "10000",
  amountPerTrade: "1000",
  marketType: "spot",
  entryOrderType: "limit",
  exitOrderType: "market",
}

const emptyRuleGroup = (): RuleGroup => ({
  logic: "and",
  conditions: [],
})

const initialStrategyState: StrategyBuilderState = {
  indicators: [],
  entryBuy: emptyRuleGroup(),
  entrySell: emptyRuleGroup(),
  exitBuy: emptyRuleGroup(),
  exitSell: emptyRuleGroup(),
}

function createIndicator(): IndicatorConfig {
  return {
    id: crypto.randomUUID(),
    name: "",
    source: "close",
    period: "",
    fastPeriod: "",
    slowPeriod: "",
    signalPeriod: "",
    stdDev: "",
  }
}

function toParamsObject(params: IndicatorRecord["params"]) {
  if (!params || typeof params !== "object") return {}
  return Object.fromEntries(Object.entries(params))
}

function getFallbackIndicatorDefaults(name: string): IndicatorDefaults {
  switch (name) {
    case "rsi":
      return { source: "close", period: "14" }
    case "ema":
    case "sma":
    case "wma":
    case "adx":
    case "atr":
      return { source: "close", period: "14" }
    case "stochastic":
      return { source: "close", period: "14", signalPeriod: "3" }
    case "bb":
      return { period: "20", stdDev: "2" }
    case "macd":
      return {
        source: "close",
        fastPeriod: "12",
        slowPeriod: "26",
        signalPeriod: "9",
      }
    case "vwap":
      return {}
    default:
      return { source: "close" }
  }
}

function getIndicatorDefaults(
  indicator: IndicatorRecord | undefined
): IndicatorDefaults {
  if (!indicator) return {}

  const params = toParamsObject(indicator.params)
  const fallback = getFallbackIndicatorDefaults(indicator.name)

  return {
    source:
      typeof indicator.source === "string" && indicator.source
        ? indicator.source
        : fallback.source,
    period:
      typeof params.period === "number" || typeof params.period === "string"
        ? String(params.period)
        : fallback.period,
    fastPeriod:
      typeof params.fastPeriod === "number" ||
      typeof params.fastPeriod === "string"
        ? String(params.fastPeriod)
        : fallback.fastPeriod,
    slowPeriod:
      typeof params.slowPeriod === "number" ||
      typeof params.slowPeriod === "string"
        ? String(params.slowPeriod)
        : fallback.slowPeriod,
    signalPeriod:
      typeof params.signalPeriod === "number" ||
      typeof params.signalPeriod === "string"
        ? String(params.signalPeriod)
        : fallback.signalPeriod,
    stdDev:
      typeof params.stdDev === "number" || typeof params.stdDev === "string"
        ? String(params.stdDev)
        : fallback.stdDev,
  }
}

function createCondition(defaultLeft = ""): ConditionConfig {
  return {
    id: crypto.randomUUID(),
    left: defaultLeft,
    operator: ">",
    rightMode: "indicator",
    rightIndicator: "",
    rightValue: "",
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function formatCompactTime(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildEquityCurvePath(points: BacktestResult["equityCurves"]) {
  if (!points.length) return null

  const width = 100
  const height = 100
  const values = points.map((point) => point.equity)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const line = points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width
      const y = height - ((point.equity - min) / range) * height
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")

  const area = `${line} L ${width} ${height} L 0 ${height} Z`

  return { line, area, min, max }
}

function buildReadinessLabel(result: BacktestResult) {
  if (result.profitFactor >= 1.5 && result.maxDrawdownPercent <= 10) {
    return "Ready for review"
  }
  if (result.profitFactor >= 1 && result.winRate >= 40) {
    return "Mixed quality"
  }
  return "Needs revision"
}

function buildReadinessScore(result: BacktestResult) {
  const pnlScore = Math.max(
    0,
    Math.min(
      35,
      ((result.finalBalance - result.initialBalance) / result.initialBalance) *
        120
    )
  )
  const profitFactorScore = Math.max(0, Math.min(35, result.profitFactor * 20))
  const drawdownScore = Math.max(0, 30 - result.maxDrawdownPercent * 2)

  return Math.round(pnlScore + profitFactorScore + drawdownScore)
}

function buildIndicatorReference(indicator: IndicatorConfig) {
  if (!indicator.name) return ""
  if (indicator.name === "macd") {
    return `macd_${indicator.fastPeriod}_${indicator.slowPeriod}_${indicator.signalPeriod}`
  }
  if (indicator.name === "bb") {
    return `bb_${indicator.period}`
  }
  return `${indicator.name}_${indicator.period}`
}

function mapIndicatorToPayload(indicator: IndicatorConfig) {
  if (indicator.name === "macd") {
    return {
      name: indicator.name,
      fastPeriod: Number(indicator.fastPeriod),
      slowPeriod: Number(indicator.slowPeriod),
      signalPeriod: Number(indicator.signalPeriod),
      source: indicator.source,
    }
  }

  if (indicator.name === "bb") {
    return {
      name: indicator.name,
      period: Number(indicator.period),
      stdDev: Number(indicator.stdDev),
    }
  }

  return {
    name: indicator.name,
    period: Number(indicator.period),
    source: indicator.source,
  }
}

function MenuSelect({
  label,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
}: MenuSelectProps) {
  const activeLabel =
    options.find((option) => option.value === value)?.label ?? placeholder

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className="h-10 w-full justify-between rounded-xl border-input bg-background px-3 font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {activeLabel}
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup
          aria-label={label}
          value={value}
          onValueChange={onChange}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SearchSelect({
  value,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  options,
  disabled = false,
  onChange,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const activeLabel =
    options.find((option) => option.value === value)?.label ?? placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-between rounded-xl border-input bg-background px-3 font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {activeLabel}
          </span>
          <Search className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && (
                    <Check className="ml-auto size-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function DatePickerField({
  value,
  onChange,
  disabled,
}: {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  disabled?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-between rounded-xl border-input bg-background px-3 font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? format(value, "PPP") : "Pick a date"}
          </span>
          <CalendarIcon className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  )
}

export default function Backtest() {
  const user = useAuthStore((state) => state.user)
  const [form, setForm] = useState<TopLevelForm>(initialTopLevelForm)
  const [strategy, setStrategy] =
    useState<StrategyBuilderState>(initialStrategyState)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [availableIndicators, setAvailableIndicators] = useState<
    IndicatorRecord[]
  >([])
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(true)
  const [symbols, setSymbols] = useState<string[]>([])
  const [timeframes, setTimeframes] = useState<string[]>([])
  const [isLoadingExchangeData, setIsLoadingExchangeData] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadIndicators = async () => {
      try {
        const data = await getIndicators()
        if (!isMounted) return
        setAvailableIndicators(data.result.indicators)
      } catch {
        if (!isMounted) return
        toast.error("Failed to load indicators")
      } finally {
        if (isMounted) setIsLoadingIndicators(false)
      }
    }

    loadIndicators()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!form.exchange) {
      setSymbols([])
      setTimeframes([])
      setForm((current) => ({ ...current, symbol: "", timeframe: "" }))
      return () => {
        isMounted = false
      }
    }

    const loadExchangeData = async () => {
      setIsLoadingExchangeData(true)

      try {
        const data = await exchangeSupportedData({
          exchange: form.exchange,
          marketType: form.marketType,
        })

        if (!isMounted) return

        const nextSymbols = data.result.data.symbols
        const nextTimeframes = Object.values(data.result.data.timeframes)

        setSymbols(nextSymbols)
        setTimeframes(nextTimeframes)
        setForm((current) => ({
          ...current,
          symbol:
            current.symbol && nextSymbols.includes(current.symbol)
              ? current.symbol
              : "",
          timeframe:
            current.timeframe && nextTimeframes.includes(current.timeframe)
              ? current.timeframe
              : "",
        }))
      } catch {
        if (!isMounted) return
        setSymbols([])
        setTimeframes([])
        setForm((current) => ({ ...current, symbol: "", timeframe: "" }))
        toast.error("Failed to load symbols and timeframes")
      } finally {
        if (isMounted) setIsLoadingExchangeData(false)
      }
    }

    loadExchangeData()

    return () => {
      isMounted = false
    }
  }, [form.exchange, form.marketType])

  const indicatorReferences = useMemo(
    () =>
      strategy.indicators
        .map(buildIndicatorReference)
        .filter(Boolean)
        .map((reference) => ({ label: reference, value: reference })),
    [strategy.indicators]
  )

  const indicatorOptions = useMemo(
    () =>
      availableIndicators.map((indicator) => ({
        label: indicator.name,
        value: indicator.name,
      })),
    [availableIndicators]
  )

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const canEditBacktestInputs = Boolean(form.exchange) && !isLoadingExchangeData

  const updateForm = <K extends keyof TopLevelForm>(
    field: K,
    value: TopLevelForm[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const addIndicator = () => {
    setStrategy((current) => ({
      ...current,
      indicators: [...current.indicators, createIndicator()],
    }))
  }

  const updateIndicator = <K extends keyof IndicatorConfig>(
    indicatorId: string,
    field: K,
    value: IndicatorConfig[K]
  ) => {
    setStrategy((current) => ({
      ...current,
      indicators: current.indicators.map((indicator) =>
        indicator.id === indicatorId
          ? { ...indicator, [field]: value }
          : indicator
      ),
    }))
  }

  const applyIndicatorSelection = (
    indicatorId: string,
    indicatorName: string
  ) => {
    const selectedIndicator = availableIndicators.find(
      (indicator) => indicator.name === indicatorName
    )
    const defaults = getIndicatorDefaults(selectedIndicator)

    setStrategy((current) => ({
      ...current,
      indicators: current.indicators.map((indicator) =>
        indicator.id === indicatorId
          ? {
              ...indicator,
              name: indicatorName,
              source: defaults.source ?? indicator.source,
              period: defaults.period ?? "",
              fastPeriod: defaults.fastPeriod ?? "",
              slowPeriod: defaults.slowPeriod ?? "",
              signalPeriod: defaults.signalPeriod ?? "",
              stdDev: defaults.stdDev ?? "",
            }
          : indicator
      ),
    }))
  }

  const removeIndicator = (indicatorId: string) => {
    setStrategy((current) => ({
      ...current,
      indicators: current.indicators.filter(
        (indicator) => indicator.id !== indicatorId
      ),
      entryBuy: {
        ...current.entryBuy,
        conditions: current.entryBuy.conditions.map((condition) => ({
          ...condition,
          left: condition.left,
          rightIndicator: condition.rightIndicator,
        })),
      },
      entrySell: {
        ...current.entrySell,
        conditions: current.entrySell.conditions.map((condition) => ({
          ...condition,
          left: condition.left,
          rightIndicator: condition.rightIndicator,
        })),
      },
      exitBuy: {
        ...current.exitBuy,
        conditions: current.exitBuy.conditions.map((condition) => ({
          ...condition,
          left: condition.left,
          rightIndicator: condition.rightIndicator,
        })),
      },
      exitSell: {
        ...current.exitSell,
        conditions: current.exitSell.conditions.map((condition) => ({
          ...condition,
          left: condition.left,
          rightIndicator: condition.rightIndicator,
        })),
      },
    }))
  }

  const addCondition = (
    groupKey: keyof Omit<StrategyBuilderState, "indicators">
  ) => {
    setStrategy((current) => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        conditions: [
          ...current[groupKey].conditions,
          createCondition(indicatorReferences[0]?.value || ""),
        ],
      },
    }))
  }

  const updateCondition = <K extends keyof ConditionConfig>(
    groupKey: keyof Omit<StrategyBuilderState, "indicators">,
    conditionId: string,
    field: K,
    value: ConditionConfig[K]
  ) => {
    setStrategy((current) => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        conditions: current[groupKey].conditions.map((condition) =>
          condition.id === conditionId
            ? { ...condition, [field]: value }
            : condition
        ),
      },
    }))
  }

  const removeCondition = (
    groupKey: keyof Omit<StrategyBuilderState, "indicators">,
    conditionId: string
  ) => {
    setStrategy((current) => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        conditions: current[groupKey].conditions.filter(
          (condition) => condition.id !== conditionId
        ),
      },
    }))
  }

  const buildStrategyPayload = () => {
    const mapGroup = (group: RuleGroup) => ({
      logic: group.logic,
      conditions: group.conditions
        .filter(
          (condition) =>
            condition.left &&
            (condition.rightMode === "indicator"
              ? condition.rightIndicator
              : condition.rightValue.trim() !== "")
        )
        .map((condition) => ({
          left: condition.left,
          operator: condition.operator,
          right:
            condition.rightMode === "indicator"
              ? condition.rightIndicator
              : Number.isFinite(Number(condition.rightValue))
                ? Number(condition.rightValue)
                : condition.rightValue.trim(),
        })),
    })

    return {
      indicators: strategy.indicators
        .filter((indicator) => indicator.name)
        .map(mapIndicatorToPayload),
      entry: {
        buy: mapGroup(strategy.entryBuy),
        sell: mapGroup(strategy.entrySell),
      },
      exit: {
        buy: mapGroup(strategy.exitBuy),
        sell: mapGroup(strategy.exitSell),
      },
    }
  }

  const handleRunBacktest = async () => {
    if (!form.exchange) {
      toast.error("Choose an exchange first")
      return
    }
    if (!form.symbol || !form.timeframe) {
      toast.error("Choose a symbol and timeframe")
      return
    }
    if (!form.startTime || !form.endTime) {
      toast.error("Pick start and end dates")
      return
    }
    if (!strategy.indicators.length) {
      toast.error("Add at least one indicator")
      return
    }

    const initialBalance = Number(form.initialBalance)
    const amountPerTrade = Number(form.amountPerTrade)

    if (!initialBalance || !amountPerTrade) {
      toast.error("Initial balance and amount per trade must be valid numbers")
      return
    }

    setIsRunning(true)
    toast.loading("Running backtest...", { id: RUN_TOAST_ID })

    try {
      const data = await runBacktest({
        exchange: form.exchange,
        symbol: form.symbol,
        timeframe: form.timeframe,
        startTime: form.startTime.toISOString(),
        endTime: form.endTime.toISOString(),
        initialBalance,
        amountPerTrade,
        marketType: form.marketType,
        entryOrderType: form.entryOrderType,
        exitOrderType: form.exitOrderType,
        strategy: buildStrategyPayload(),
      })

      setResult(data.result.backtest)
      toast.success(data.message || "Backtest completed.", { id: RUN_TOAST_ID })
    } catch (error: unknown) {
      toast.error(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Backtest run failed",
        { id: RUN_TOAST_ID }
      )
    } finally {
      setIsRunning(false)
    }
  }

  const headlineStats = result
    ? [
        {
          label: "Return",
          value: formatPercent(
            ((result.finalBalance - result.initialBalance) /
              result.initialBalance) *
              100
          ),
          detail: `${formatCurrency(result.totalPnL)} total PnL`,
          accent: result.totalPnL >= 0 ? "text-emerald-500" : "text-rose-500",
          icon: TrendingUp,
        },
        {
          label: "Max drawdown",
          value: formatPercent(result.maxDrawdownPercent),
          detail: formatCurrency(result.maxDrawdown),
          accent: "text-sky-500",
          icon: ShieldCheck,
        },
        {
          label: "Win rate",
          value: formatPercent(result.winRate),
          detail: `${result.wins} wins / ${result.losses} losses`,
          accent: "text-amber-500",
          icon: Gauge,
        },
        {
          label: "Profit factor",
          value: result.profitFactor.toFixed(2),
          detail: `${result.totalTrades} total trades`,
          accent: "text-fuchsia-500",
          icon: CircleDollarSign,
        },
      ]
    : [
        {
          label: "Return",
          value: "--",
          detail: "Run a backtest to populate results",
          accent: "text-emerald-500",
          icon: TrendingUp,
        },
        {
          label: "Max drawdown",
          value: "--",
          detail: "Waiting for server response",
          accent: "text-sky-500",
          icon: ShieldCheck,
        },
        {
          label: "Win rate",
          value: "--",
          detail: "Waiting for server response",
          accent: "text-amber-500",
          icon: Gauge,
        },
        {
          label: "Profit factor",
          value: "--",
          detail: "Waiting for server response",
          accent: "text-fuchsia-500",
          icon: CircleDollarSign,
        },
      ]

  const readinessScore = result ? buildReadinessScore(result) : 0
  const readinessLabel = result ? buildReadinessLabel(result) : "Awaiting run"
  const equityCurve = result ? buildEquityCurvePath(result.equityCurves) : null
  const metrics = result
    ? [
        ["Final balance", formatCurrency(result.finalBalance)],
        ["Average win", formatCurrency(result.averageWin)],
        ["Average loss", formatCurrency(result.averageLoss)],
        ["Average trade", formatCurrency(result.averageTradePnL)],
        ["Gross profit", formatCurrency(result.grossProfit)],
        ["Total fees", formatCurrency(result.totalFees)],
      ]
    : []
  const recentTrades = result ? result.trades.slice(-3).reverse() : []

  const ruleSections: Array<{
    title: string
    key: keyof Omit<StrategyBuilderState, "indicators">
  }> = [
    { title: "Entry Buy", key: "entryBuy" },
    { title: "Entry Sell", key: "entrySell" },
    { title: "Exit Buy", key: "exitBuy" },
    { title: "Exit Sell", key: "exitSell" },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.9),rgba(248,250,252,0.88))] p-6 shadow-sm md:p-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_24%),linear-gradient(135deg,rgba(10,10,10,0.92),rgba(17,24,39,0.9))]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,transparent_48%,rgba(255,255,255,0.28)_50%,transparent_52%,transparent_100%)] opacity-40 dark:opacity-10" />
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/75 px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase backdrop-blur">
            <Sparkles className="size-3.5 text-amber-500" />
            Backtest Workspace
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
                Build the market setup first, then layer indicators and logic
                before launching a clean backtest run.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                The setup flow stays visible first. Result cards only appear
                after a completed run so the workspace stays focused while you
                build.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Exchange", form.exchange || "Not selected"],
                ["Symbols", symbols.length ? String(symbols.length) : "--"],
                ["Timeframes", timeframes.length ? String(timeframes.length) : "--"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[28px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <SlidersHorizontal className="size-4 text-primary" />
            Market Setup
          </CardTitle>
          <CardDescription>
            Start with exchange. The rest unlocks after supported data loads.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Exchange</Label>
            <MenuSelect
              label="Exchange"
              value={form.exchange}
              placeholder="Choose exchange"
              options={exchangeOptions}
              onChange={(value) => updateForm("exchange", value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Market Type</Label>
            <MenuSelect
              label="Market type"
              value={form.marketType}
              placeholder="Choose market type"
              options={marketTypeOptions}
              onChange={(value) => updateForm("marketType", value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Symbol</Label>
            <SearchSelect
              value={form.symbol}
              placeholder={
                form.exchange
                  ? isLoadingExchangeData
                    ? "Loading symbols..."
                    : "Choose symbol"
                  : "Select exchange first"
              }
              searchPlaceholder="Search symbols..."
              emptyLabel="No symbol found."
              options={symbols.map((symbol) => ({
                label: symbol,
                value: symbol,
              }))}
              disabled={!canEditBacktestInputs}
              onChange={(value) => updateForm("symbol", value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Timeframe</Label>
            <SearchSelect
              value={form.timeframe}
              placeholder={
                form.exchange
                  ? isLoadingExchangeData
                    ? "Loading timeframes..."
                    : "Choose timeframe"
                  : "Select exchange first"
              }
              searchPlaceholder="Search timeframes..."
              emptyLabel="No timeframe found."
              options={timeframes.map((timeframe) => ({
                label: timeframe,
                value: timeframe,
              }))}
              disabled={!canEditBacktestInputs}
              onChange={(value) => updateForm("timeframe", value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <DatePickerField
              value={form.startTime}
              onChange={(value) => updateForm("startTime", value)}
              disabled={!canEditBacktestInputs}
            />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <DatePickerField
              value={form.endTime}
              onChange={(value) => updateForm("endTime", value)}
              disabled={!canEditBacktestInputs}
            />
          </div>

          <div className="space-y-2">
            <Label>Initial Balance</Label>
            <Input
              value={form.initialBalance}
              onChange={(event) =>
                updateForm("initialBalance", event.target.value)
              }
              disabled={!canEditBacktestInputs}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Amount Per Trade</Label>
            <Input
              value={form.amountPerTrade}
              onChange={(event) =>
                updateForm("amountPerTrade", event.target.value)
              }
              disabled={!canEditBacktestInputs}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Entry Order</Label>
            <MenuSelect
              label="Entry order"
              value={form.entryOrderType}
              placeholder="Choose order type"
              options={orderTypeOptions}
              disabled={!canEditBacktestInputs}
              onChange={(value) => updateForm("entryOrderType", value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Exit Order</Label>
            <MenuSelect
              label="Exit order"
              value={form.exitOrderType}
              placeholder="Choose order type"
              options={orderTypeOptions}
              disabled={!canEditBacktestInputs}
              onChange={(value) => updateForm("exitOrderType", value)}
            />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6">
        <Card className="rounded-[28px]">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Indicators</CardTitle>
              <CardDescription>
                Empty by default. Add only the indicators you actually want.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addIndicator}
              disabled={!canEditBacktestInputs || isLoadingIndicators}
            >
              <Plus className="size-4" />
              Add indicator
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {strategy.indicators.length ? (
              strategy.indicators.map((indicator) => {
                const showMacdFields = indicator.name === "macd"
                const showBbFields = indicator.name === "bb"

                return (
                  <div
                    key={indicator.id}
                    className="rounded-3xl border border-border/60 bg-muted/20 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {buildIndicatorReference(indicator) ||
                            "Unconfigured indicator"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added indicators become the only selectable operands
                          in entry and exit logic.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeIndicator(indicator.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Indicator</Label>
                        <SearchSelect
                          value={indicator.name}
                          placeholder="Choose indicator"
                          searchPlaceholder="Search indicators..."
                          emptyLabel="No indicator found."
                          options={indicatorOptions}
                          disabled={
                            !canEditBacktestInputs || isLoadingIndicators
                          }
                          onChange={(value) =>
                            applyIndicatorSelection(indicator.id, value)
                          }
                        />
                      </div>

                      {indicator.name ? (
                        <>
                          <div className="space-y-2">
                            <Label>Source</Label>
                            <MenuSelect
                              label="Source"
                              value={indicator.source}
                              placeholder="Choose source"
                              options={sourceOptions}
                              disabled={!canEditBacktestInputs || showBbFields}
                              onChange={(value) =>
                                updateIndicator(indicator.id, "source", value)
                              }
                            />
                          </div>

                          {showMacdFields ? (
                            <>
                              <div className="space-y-2">
                                <Label>Fast Period</Label>
                                <Input
                                  value={indicator.fastPeriod}
                                  onChange={(event) =>
                                    updateIndicator(
                                      indicator.id,
                                      "fastPeriod",
                                      event.target.value
                                    )
                                  }
                                  className="h-10 rounded-xl"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Slow Period</Label>
                                <Input
                                  value={indicator.slowPeriod}
                                  onChange={(event) =>
                                    updateIndicator(
                                      indicator.id,
                                      "slowPeriod",
                                      event.target.value
                                    )
                                  }
                                  className="h-10 rounded-xl"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Signal Period</Label>
                                <Input
                                  value={indicator.signalPeriod}
                                  onChange={(event) =>
                                    updateIndicator(
                                      indicator.id,
                                      "signalPeriod",
                                      event.target.value
                                    )
                                  }
                                  className="h-10 rounded-xl"
                                />
                              </div>
                            </>
                          ) : showBbFields ? (
                            <>
                              <div className="space-y-2">
                                <Label>Period</Label>
                                <Input
                                  value={indicator.period}
                                  onChange={(event) =>
                                    updateIndicator(
                                      indicator.id,
                                      "period",
                                      event.target.value
                                    )
                                  }
                                  className="h-10 rounded-xl"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Std Dev</Label>
                                <Input
                                  value={indicator.stdDev}
                                  onChange={(event) =>
                                    updateIndicator(
                                      indicator.id,
                                      "stdDev",
                                      event.target.value
                                    )
                                  }
                                  className="h-10 rounded-xl"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <Label>Period</Label>
                              <Input
                                value={indicator.period}
                                onChange={(event) =>
                                  updateIndicator(
                                    indicator.id,
                                    "period",
                                    event.target.value
                                  )
                                }
                                className="h-10 rounded-xl"
                              />
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
                No indicators yet. Add one to start building strategy logic.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardHeader>
            <CardTitle className="text-xl">Entry & Exit Logic</CardTitle>
            <CardDescription>
              Left side searches only your added indicators. Right side toggles
              between indicator mode and manual value mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {ruleSections.map((section) => {
              const group = strategy[section.key]

              return (
                <div
                  key={section.key}
                  className="rounded-3xl border border-border/60 bg-muted/20 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{section.title}</p>
                      <p className="text-xs text-muted-foreground">
                        No default rules. Add exactly the conditions you need.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="w-full sm:w-[120px]">
                        <MenuSelect
                          label="Logic"
                          value={group.logic}
                          placeholder="Logic"
                          options={logicOptions}
                          disabled={!canEditBacktestInputs}
                          onChange={(value) =>
                            setStrategy((current) => ({
                              ...current,
                              [section.key]: {
                                ...current[section.key],
                                logic: value,
                              },
                            }))
                          }
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addCondition(section.key)}
                        disabled={
                          !canEditBacktestInputs || !indicatorReferences.length
                        }
                        className="w-full sm:w-auto"
                      >
                        <Plus className="size-4" />
                        Condition
                      </Button>
                    </div>
                  </div>

                  {group.conditions.length ? (
                    <div className="space-y-3">
                      {group.conditions.map((condition) => (
                        <div
                          key={condition.id}
                          className="rounded-2xl border border-border/60 bg-background/85 p-3"
                        >
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)_auto]">
                            <SearchSelect
                              value={condition.left}
                              placeholder="Choose left indicator"
                              searchPlaceholder="Search added indicators..."
                              emptyLabel="No added indicator found."
                              options={indicatorReferences}
                              disabled={!canEditBacktestInputs}
                              onChange={(value) =>
                                updateCondition(
                                  section.key,
                                  condition.id,
                                  "left",
                                  value
                                )
                              }
                            />

                            <MenuSelect
                              label="Operator"
                              value={condition.operator}
                              placeholder="Operator"
                              options={operatorOptions}
                              disabled={!canEditBacktestInputs}
                              onChange={(value) =>
                                updateCondition(
                                  section.key,
                                  condition.id,
                                  "operator",
                                  value
                                )
                              }
                            />

                            <div className="space-y-2 min-w-0">
                              {condition.rightMode === "indicator" ? (
                                <SearchSelect
                                  value={condition.rightIndicator}
                                  placeholder="Choose right indicator"
                                  searchPlaceholder="Search added indicators..."
                                  emptyLabel="No added indicator found."
                                  options={indicatorReferences}
                                  disabled={!canEditBacktestInputs}
                                  onChange={(value) =>
                                    updateCondition(
                                      section.key,
                                      condition.id,
                                      "rightIndicator",
                                      value
                                    )
                                  }
                                />
                              ) : (
                                <Input
                                  value={condition.rightValue}
                                  onChange={(event) =>
                                    updateCondition(
                                      section.key,
                                      condition.id,
                                      "rightValue",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Enter number or price"
                                  className="h-10 rounded-xl"
                                />
                              )}

                              <div className="flex gap-2">
                                <Button
                                  variant={
                                    condition.rightMode === "indicator"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="flex-1"
                                  onClick={() =>
                                    updateCondition(
                                      section.key,
                                      condition.id,
                                      "rightMode",
                                      "indicator"
                                    )
                                  }
                                >
                                  Indicator
                                </Button>
                                <Button
                                  variant={
                                    condition.rightMode === "value"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="flex-1"
                                  onClick={() =>
                                    updateCondition(
                                      section.key,
                                      condition.id,
                                      "rightMode",
                                      "value"
                                    )
                                  }
                                >
                                  Value
                                </Button>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="self-start sm:self-start"
                              onClick={() =>
                                removeCondition(section.key, condition.id)
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      No conditions yet.
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[28px] border-primary/15 bg-linear-to-r from-primary/[0.08] via-background to-amber-500/[0.08]">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Ready to run this setup?</p>
            <p className="text-sm text-muted-foreground">
              Launch the backtest after market setup, indicators, and entry or
              exit logic are configured.
            </p>
          </div>
          <Button
            size="lg"
            className="shadow-sm"
            onClick={handleRunBacktest}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {isRunning ? "Running backtest" : "Run backtest"}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="size-4 text-primary" />
                Equity Curve Snapshot
              </CardTitle>
              <CardDescription>
                Derived from `result.backtest.equityCurves`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-border/60 bg-linear-to-b from-muted/20 to-muted/60 p-4">
                {equityCurve ? (
                  <div className="space-y-3">
                    <div className="h-56 w-full overflow-hidden rounded-[20px] bg-background/70 p-3">
                      <svg
                        viewBox="0 0 100 100"
                        className="h-full w-full"
                        preserveAspectRatio="none"
                        aria-label="Equity curve chart"
                      >
                        <defs>
                          <linearGradient
                            id="equity-area"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0.04" />
                          </linearGradient>
                        </defs>
                        <path
                          d={equityCurve.area}
                          fill="url(#equity-area)"
                        />
                        <path
                          d={equityCurve.line}
                          fill="none"
                          stroke="rgb(14 165 233)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border/60 bg-background p-3">
                        <p className="text-xs text-muted-foreground">Curve low</p>
                        <p className="mt-1 text-lg font-semibold">
                          {formatCurrency(equityCurve.min)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background p-3">
                        <p className="text-xs text-muted-foreground">Curve high</p>
                        <p className="mt-1 text-lg font-semibold">
                          {formatCurrency(equityCurve.max)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-56 w-full items-center justify-center text-sm text-muted-foreground">
                    No equity curve available.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {metrics.length ? (
                  metrics.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-border/60 bg-background p-3"
                    >
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-semibold">{value}</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    No server response yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="size-4 text-primary" />
                Recent Trades
              </CardTitle>
              <CardDescription>
                Last closed trades from `result.backtest.trades`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTrades.length ? (
                recentTrades.map((trade) => (
                  <div
                    key={`${trade.entryTime}-${trade.exitTime}-${trade.side}`}
                    className="rounded-2xl border border-border/60 bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium uppercase">
                        {trade.side} {trade.symbol}
                      </p>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          trade.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}
                      >
                        {formatCurrency(trade.pnl)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Entry {formatCompactTime(trade.entryTime)} at{" "}
                      {formatCurrency(trade.entryPrice)}. Exit{" "}
                      {formatCompactTime(trade.exitTime)} at{" "}
                      {formatCurrency(trade.exitPrice)}.
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  No trades loaded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-[28px] border-primary/15 bg-linear-to-br from-primary/[0.12] via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bolt className="size-4 text-primary" />
                Run Health
              </CardTitle>
              <CardDescription>
                Quick interpretation of the latest backtest result.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Readiness score</p>
                    <p className="text-xs text-muted-foreground">
                      Based on PnL, drawdown, and profit factor.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold">{readinessScore}</p>
                    <p className="text-xs text-muted-foreground">
                      {readinessLabel}
                    </p>
                  </div>
                </div>
              </div>

              {result ? (
                [
                  `Backtest window: ${formatCompactTime(result.startTime)} to ${formatCompactTime(result.endTime)}`,
                  `Trades processed: ${result.totalTrades} with ${formatCurrency(result.totalFees)} in total fees`,
                  `Largest win/loss: ${formatCurrency(result.maxWin)} / ${formatCurrency(result.maxLoss)}`,
                  `Gross profit vs loss: ${formatCurrency(result.grossProfit)} / ${formatCurrency(result.grossLoss)}`,
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/85 px-4 py-3"
                  >
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <p className="text-sm">{item}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  Health summary appears after the first completed run.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </section>
      ) : null}

      {result ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {headlineStats.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.label} className="rounded-3xl">
                <CardContent className="flex items-start justify-between pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {item.value}
                    </p>
                    <p className={`mt-2 text-xs font-medium ${item.accent}`}>
                      {item.detail}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/50 p-2.5">
                    <Icon className={`size-5 ${item.accent}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
