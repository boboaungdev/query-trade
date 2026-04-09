import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  ChevronLeft,
  ChevronsUpDown,
  CirclePlus,
  CircleHelp,
  TrendingDown,
  TrendingUp,
  Pencil,
  Globe,
  Lock,
  Loader2,
  ListFilter,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { getApiErrorMessage } from "@/api/axios"
import { fetchIndicators } from "@/api/indicator"
import {
  createStrategy,
  fetchStrategyById,
  type CreateStrategyPayload,
  type StrategyCondition,
  type StrategyLogicBlock,
  updateStrategy,
} from "@/api/strategy"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type OperandMode = "candle" | "indicator" | "number"
type OperandField = "open" | "high" | "low" | "close" | "volume"
type LogicOperator =
  | ">"
  | "<"
  | ">="
  | "<="
  | "=="
  | "!="
  | "crossAbove"
  | "crossBelow"
type ParamType = "number" | "string" | "boolean"
type IndicatorSortField = "name" | "createdAt"
type SortOrder = "asc" | "desc"
type IndicatorCategory =
  | "trend"
  | "momentum"
  | "volatility"
  | "volume"
  | "support_resistance"

type IndicatorDefinition = {
  _id: string
  name: string
  description: string
  category: IndicatorCategory
  source?: OperandField
  params?: Record<string, unknown>
}

type IndicatorResponse = {
  result?: {
    indicators?: IndicatorDefinition[]
    hasNextPage?: boolean
  }
}

type IndicatorQuery = {
  page?: number
  search?: string
  sortBy?: IndicatorSortField
  order?: SortOrder
  category?: IndicatorCategory
}

type ParamDraft = {
  id: string
  key: string
  value: string
  defaultValue: string
  type: ParamType
}

type IndicatorDraft = {
  id: string
  indicator: string
  indicatorName: string
  indicatorDescription: string
  key: string
  source: OperandField
  params: ParamDraft[]
}

type OperandDraft = {
  mode: OperandMode
  value: string
}

type DropdownOption<T extends string> = {
  label: string
  value: T
  group?: string
  disabled?: boolean
}

type ConditionRule = {
  id: string
  type: "rule"
  left: OperandDraft
  operator: LogicOperator
  right: OperandDraft
}

type ConditionGroup = {
  id: string
  type: "group"
  logic: "and" | "or"
  conditions: ConditionNode[]
}

type ConditionNode = ConditionRule | ConditionGroup

type StopLossDraft = {
  type: "candle" | "indicator" | "percent" | "atr"
  previousCandles: string
  candleAggregation: "single" | "min" | "max" | "average"
  indicator: string
  percentValue: string
  atrPeriod: string
  atrMultiplier: string
}

type TakeProfitDraft = {
  type: "riskReward" | "percent" | "indicator" | "candle"
  ratio: string
  percentValue: string
  indicator: string
  reference: "previous" | "current"
  candlePrice: "open" | "high" | "low" | "close"
}

type LogicBlockDraft = {
  logic: "and" | "or"
  conditions: ConditionNode[]
  riskManagement: {
    stopLoss: StopLossDraft
    takeProfit: TakeProfitDraft
  }
}

type StrategyDetailItem = {
  _id: string
  name?: string
  description?: string
  isPublic?: boolean
  indicators?: Array<{
    key?: string
    source?: OperandField
    params?: Record<string, unknown>
    indicator?: {
      _id?: string
      name?: string
      description?: string
      category?: IndicatorCategory
    }
  }>
  entry?: {
    buy?: StrategyLogicBlock
    sell?: StrategyLogicBlock
  }
}

type StrategyDetailResponse = {
  result?: {
    strategy?: StrategyDetailItem
  }
}

const EMPTY_INDICATOR_OPTION_VALUE = "__no_indicator_added__"

const sourceOptions: OperandField[] = ["open", "high", "low", "close", "volume"]
const operatorOptions: LogicOperator[] = [
  ">",
  "<",
  ">=",
  "<=",
  "==",
  "!=",
  "crossAbove",
  "crossBelow",
]

const indicatorCategoryOptions: Array<{
  label: string
  value: IndicatorCategory | "all"
}> = [
  { label: "All", value: "all" },
  { label: "Trend", value: "trend" },
  { label: "Momentum", value: "momentum" },
  { label: "Volatility", value: "volatility" },
  { label: "Volume", value: "volume" },
  { label: "Support/Resistance", value: "support_resistance" },
]

const indicatorSortOptions: Array<{
  label: string
  value: IndicatorSortField
}> = [
  { label: "Name", value: "name" },
  { label: "Newest", value: "createdAt" },
]

const indicatorResponseCache = new Map<string, IndicatorResponse>()
const indicatorResponseInFlight = new Map<string, Promise<IndicatorResponse>>()

function buildIndicatorQueryKey(query: IndicatorQuery) {
  return JSON.stringify({
    page: query.page ?? 1,
    search: query.search?.trim() ?? "",
    sortBy: query.sortBy ?? "name",
    order: query.order ?? "asc",
    category: query.category ?? "",
  })
}

async function fetchIndicatorsOnce(query: IndicatorQuery) {
  const cacheKey = buildIndicatorQueryKey(query)
  const cached = indicatorResponseCache.get(cacheKey)
  if (cached) return cached

  const pending = indicatorResponseInFlight.get(cacheKey)
  if (pending) return pending

  const request = (async () => {
    const response = (await fetchIndicators(query)) as IndicatorResponse
    indicatorResponseCache.set(cacheKey, response)
    return response
  })()

  indicatorResponseInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    indicatorResponseInFlight.delete(cacheKey)
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function inferParamType(value: unknown): ParamType {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  return "string"
}

function createParamDrafts(params?: Record<string, unknown>): ParamDraft[] {
  if (!params) return []

  return Object.entries(params).map(([key, value]) => ({
    id: createId(),
    key,
    value: String(value),
    defaultValue: String(value),
    type: inferParamType(value),
  }))
}

function buildIndicatorKey(name: string, params: ParamDraft[]) {
  const base = name.trim().toLowerCase().replace(/\s+/g, "_")
  const suffix = params
    .map((param) => String(param.value).trim())
    .filter(Boolean)
    .join("_")

  return suffix ? `${base}_${suffix}` : base
}

function buildUniqueIndicatorKey(
  name: string,
  params: ParamDraft[],
  drafts: IndicatorDraft[],
  excludeId?: string
) {
  const base = buildIndicatorKey(name, params)
  const used = new Set(
    drafts
      .filter((item) => item.id !== excludeId)
      .map((item) => item.key.trim())
      .filter(Boolean)
  )

  if (!used.has(base)) return base

  let counter = 2
  while (used.has(`${base}_${counter}`)) {
    counter += 1
  }

  return `${base}_${counter}`
}

function getIndicatorOutputKeys(draft: IndicatorDraft): string[] {
  const indicatorKey = draft.key.trim()
  const indicatorName = draft.indicatorName.trim().toLowerCase()

  if (!indicatorKey) return []

  switch (indicatorName) {
    case "bb":
    case "bollingerbands":
      return [
        `${indicatorKey}.middle`,
        `${indicatorKey}.upper`,
        `${indicatorKey}.lower`,
        `${indicatorKey}.pb`,
      ]
    case "macd":
      return [
        `${indicatorKey}.MACD`,
        `${indicatorKey}.signal`,
        `${indicatorKey}.histogram`,
      ]
    case "stochastic":
      return [`${indicatorKey}.k`, `${indicatorKey}.d`]
    case "adx":
      return [
        `${indicatorKey}.adx`,
        `${indicatorKey}.pdi`,
        `${indicatorKey}.mdi`,
      ]
    default:
      return [indicatorKey]
  }
}

function buildIndicatorDropdownOptions(indicatorKeys: string[]) {
  if (indicatorKeys.length === 0) {
    return [
      {
        label: "No indicators added",
        value: EMPTY_INDICATOR_OPTION_VALUE,
      },
    ]
  }

  return indicatorKeys.map((item) => ({
    label: item,
    value: item,
  }))
}

function getFirstIndicatorKey(indicatorKeys: string[]) {
  return indicatorKeys[0] ?? ""
}

function getParamHelpText(paramKey: string) {
  switch (paramKey) {
    case "SimpleMAOscillator":
      return "Use SMA instead of EMA for the MACD fast and slow oscillator lines."
    case "SimpleMASignal":
      return "Use SMA instead of EMA for the MACD signal line."
    default:
      return ""
  }
}

function ParamHelpTooltip({
  label: _label,
  content: _content,
}: {
  label: string
  content: string
}) {
  void _label
  void _content
  return null
}

function AdaptiveTooltipIcon({
  label: _label,
  content: _content,
  className: _className,
}: {
  label: string
  content: ReactNode
  className?: string
}) {
  void _label
  void _content
  void _className
  return null
}

function createOperandDraft(
  mode: OperandMode = "candle",
  value = "close"
): OperandDraft {
  return { mode, value }
}

function createConditionRule(): ConditionRule {
  return {
    id: createId(),
    type: "rule",
    left: createOperandDraft("candle", "close"),
    operator: ">",
    right: createOperandDraft("candle", "open"),
  }
}

function createConditionGroup(): ConditionGroup {
  return {
    id: createId(),
    type: "group",
    logic: "and",
    conditions: [createConditionRule()],
  }
}

function createStopLossDraft(): StopLossDraft {
  return {
    type: "candle",
    previousCandles: "0",
    candleAggregation: "single",
    indicator: "",
    percentValue: "1",
    atrPeriod: "14",
    atrMultiplier: "2",
  }
}

function createTakeProfitDraft(): TakeProfitDraft {
  return {
    type: "riskReward",
    ratio: "2",
    percentValue: "2",
    indicator: "",
    reference: "previous",
    candlePrice: "close",
  }
}

function createLogicBlockDraft(): LogicBlockDraft {
  return {
    logic: "and",
    conditions: [createConditionRule()],
    riskManagement: {
      stopLoss: createStopLossDraft(),
      takeProfit: createTakeProfitDraft(),
    },
  }
}

function removeConditionTree(
  nodes: ConditionNode[],
  targetId: string
): ConditionNode[] {
  return nodes
    .filter((node) => node.id !== targetId)
    .map((node) => {
      if (node.type === "group") {
        return {
          ...node,
          conditions: removeConditionTree(node.conditions, targetId),
        }
      }

      return node
    })
}

function parseOperand(operand: OperandDraft, label: string) {
  if (!operand.value.trim()) {
    throw new Error(`${label} is required`)
  }

  if (operand.mode === "number") {
    const numeric = Number(operand.value)
    if (Number.isNaN(numeric)) {
      throw new Error(`${label} must be a valid number`)
    }

    return numeric
  }

  return operand.value.trim()
}

function serializeConditionNode(node: ConditionNode): StrategyCondition {
  if (node.type === "group") {
    if (node.conditions.length === 0) {
      throw new Error("Condition groups must contain at least one condition")
    }

    return {
      logic: node.logic,
      conditions: node.conditions.map(serializeConditionNode),
    }
  }

  return {
    left: parseOperand(node.left, "Condition left side"),
    operator: node.operator,
    right: parseOperand(node.right, "Condition right side"),
  }
}

function serializeStopLoss(stopLoss: StopLossDraft) {
  switch (stopLoss.type) {
    case "candle": {
      if (!stopLoss.previousCandles.trim()) {
        throw new Error("Stop loss previous candles is required")
      }

      const previousCandles = Number(stopLoss.previousCandles)
      if (!Number.isInteger(previousCandles) || previousCandles < 0) {
        throw new Error("Stop loss previous candles must be 0 or more")
      }

      return {
        type: "candle",
        previousCandles,
        aggregation: stopLoss.candleAggregation,
      }
    }
    case "indicator":
      if (!stopLoss.indicator.trim()) {
        throw new Error("Stop loss indicator key is required")
      }
      return {
        type: "indicator",
        indicator: stopLoss.indicator.trim(),
      }
    case "percent": {
      const value = Number(stopLoss.percentValue)
      if (Number.isNaN(value) || value <= 0) {
        throw new Error("Stop loss percent must be greater than 0")
      }
      return {
        type: "percent",
        value,
      }
    }
    case "atr": {
      const period = Number(stopLoss.atrPeriod)
      const multiplier = Number(stopLoss.atrMultiplier)
      if (!Number.isInteger(period) || period <= 0) {
        throw new Error("ATR period must be a positive integer")
      }
      if (Number.isNaN(multiplier) || multiplier <= 0) {
        throw new Error("ATR multiplier must be greater than 0")
      }
      return {
        type: "atr",
        period,
        multiplier,
      }
    }
  }
}

function serializeTakeProfit(takeProfit: TakeProfitDraft) {
  switch (takeProfit.type) {
    case "riskReward": {
      const ratio = Number(takeProfit.ratio)
      if (Number.isNaN(ratio) || ratio <= 0) {
        throw new Error("Take profit ratio must be greater than 0")
      }
      return {
        type: "riskReward",
        ratio,
      }
    }
    case "percent": {
      const value = Number(takeProfit.percentValue)
      if (Number.isNaN(value) || value <= 0) {
        throw new Error("Take profit percent must be greater than 0")
      }
      return {
        type: "percent",
        value,
      }
    }
    case "indicator":
      if (!takeProfit.indicator.trim()) {
        throw new Error("Take profit indicator key is required")
      }
      return {
        type: "indicator",
        indicator: takeProfit.indicator.trim(),
      }
    case "candle":
      return {
        type: "candle",
        reference: takeProfit.reference,
        price: takeProfit.candlePrice,
      }
  }
}

function serializeLogicBlock(block: LogicBlockDraft): StrategyLogicBlock {
  if (block.conditions.length === 0) {
    throw new Error("Each side needs at least one condition")
  }

  return {
    logic: block.logic,
    conditions: block.conditions.map(serializeConditionNode),
    riskManagement: {
      stopLoss: serializeStopLoss(block.riskManagement.stopLoss),
      takeProfit: serializeTakeProfit(block.riskManagement.takeProfit),
    },
  }
}

function deserializeOperand(value: unknown): OperandDraft {
  if (typeof value === "number") {
    return createOperandDraft("number", String(value))
  }

  if (typeof value === "string") {
    if (sourceOptions.includes(value as OperandField)) {
      return createOperandDraft("candle", value)
    }

    return createOperandDraft("indicator", value)
  }

  return createOperandDraft("indicator", String(value ?? ""))
}

function deserializeConditionNode(node: StrategyCondition): ConditionNode {
  if ("conditions" in node) {
    return {
      id: createId(),
      type: "group",
      logic: node.logic,
      conditions: node.conditions.map(deserializeConditionNode),
    }
  }

  return {
    id: createId(),
    type: "rule",
    left: deserializeOperand(node.left),
    operator: node.operator,
    right: deserializeOperand(node.right),
  }
}

function deserializeStopLoss(
  stopLoss?: Record<string, unknown>
): StopLossDraft {
  const fallback = createStopLossDraft()

  if (!stopLoss?.type || typeof stopLoss.type !== "string") {
    return fallback
  }

  switch (stopLoss.type) {
    case "candle":
      return {
        ...fallback,
        type: "candle",
        previousCandles: String(stopLoss.previousCandles ?? 0),
        candleAggregation:
          stopLoss.aggregation === "min" ||
          stopLoss.aggregation === "max" ||
          stopLoss.aggregation === "average" ||
          stopLoss.aggregation === "single"
            ? stopLoss.aggregation
            : fallback.candleAggregation,
      }
    case "indicator":
      return {
        ...fallback,
        type: "indicator",
        indicator: String(stopLoss.indicator ?? ""),
      }
    case "percent":
      return {
        ...fallback,
        type: "percent",
        percentValue: String(stopLoss.value ?? fallback.percentValue),
      }
    case "atr":
      return {
        ...fallback,
        type: "atr",
        atrPeriod: String(stopLoss.period ?? fallback.atrPeriod),
        atrMultiplier: String(stopLoss.multiplier ?? fallback.atrMultiplier),
      }
    default:
      return fallback
  }
}

function deserializeTakeProfit(
  takeProfit?: Record<string, unknown>
): TakeProfitDraft {
  const fallback = createTakeProfitDraft()

  if (!takeProfit?.type || typeof takeProfit.type !== "string") {
    return fallback
  }

  switch (takeProfit.type) {
    case "riskReward":
      return {
        ...fallback,
        type: "riskReward",
        ratio: String(takeProfit.ratio ?? fallback.ratio),
      }
    case "percent":
      return {
        ...fallback,
        type: "percent",
        percentValue: String(takeProfit.value ?? fallback.percentValue),
      }
    case "indicator":
      return {
        ...fallback,
        type: "indicator",
        indicator: String(takeProfit.indicator ?? ""),
      }
    case "candle":
      return {
        ...fallback,
        type: "candle",
        reference: takeProfit.reference === "current" ? "current" : "previous",
        candlePrice:
          takeProfit.price === "open" ||
          takeProfit.price === "high" ||
          takeProfit.price === "low" ||
          takeProfit.price === "close"
            ? takeProfit.price
            : fallback.candlePrice,
      }
    default:
      return fallback
  }
}

function deserializeLogicBlock(block?: StrategyLogicBlock): LogicBlockDraft {
  const fallback = createLogicBlockDraft()

  if (!block) {
    return fallback
  }

  return {
    logic: block.logic ?? fallback.logic,
    conditions:
      block.conditions?.length > 0
        ? block.conditions.map(deserializeConditionNode)
        : fallback.conditions,
    riskManagement: {
      stopLoss: deserializeStopLoss(block.riskManagement?.stopLoss),
      takeProfit: deserializeTakeProfit(block.riskManagement?.takeProfit),
    },
  }
}

function DropdownField<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  compact = false,
}: {
  value: T | ""
  onChange: (next: T) => void
  options: DropdownOption<T>[]
  placeholder?: string
  compact?: boolean
}) {
  const selectedOption = options.find((option) => option.value === value)
  const groupedOptions = options.reduce<
    Array<{ group?: string; options: DropdownOption<T>[] }>
  >((groups, option) => {
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.group === option.group) {
      lastGroup.options.push(option)
      return groups
    }

    groups.push({ group: option.group, options: [option] })
    return groups
  }, [])
  const shouldScroll = options.length > 7

  const dropdownItems = (
    <DropdownMenuRadioGroup
      value={value}
      onValueChange={(next) => onChange(next as T)}
    >
      {groupedOptions.map((group, groupIndex) => (
        <div key={`${group.group ?? "default"}-${groupIndex}`}>
          {group.group && (
            <>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{group.group}</DropdownMenuLabel>
            </>
          )}
          {group.options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="pl-2.5"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </div>
      ))}
    </DropdownMenuRadioGroup>
  )

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between font-normal",
            compact && "h-8 px-2.5",
            !selectedOption && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selectedOption?.label ?? placeholder ?? "Select option"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden p-0"
      >
        {shouldScroll ? (
          <ScrollArea className="h-56">{dropdownItems}</ScrollArea>
        ) : (
          dropdownItems
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function summarizeIndicatorParams(params: ParamDraft[]) {
  if (params.length === 0) return "No params"

  return params.map((param) => `${param.key}: ${param.value}`).join(" • ")
}

function countConditionNodes(nodes: ConditionNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === "group") {
      return count + countConditionNodes(node.conditions)
    }

    return count + 1
  }, 0)
}

function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "")
  const [head, ...tail] = normalized.split(".")

  if (tail.length === 0) return normalized

  return `${head}.${tail.join("")}`
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "")
}

function fallbackInputValue(value: string, defaultValue: string) {
  return value.trim() ? value : defaultValue
}

function summarizeRuleCount(count: number) {
  if (count <= 0) return "No rules"
  if (count === 1) return "1 rule"
  return `${count} rules`
}

function formatDraftOperand(operand: OperandDraft) {
  const value = operand.value.trim()

  if (!value) {
    return operand.mode === "number" ? "0" : "value"
  }

  return value
}

function summarizeStopLossDraft(stopLoss: StopLossDraft) {
  switch (stopLoss.type) {
    case "candle": {
      const previousCandles = Number(stopLoss.previousCandles || "0")
      const candleLabel =
        previousCandles === 0
          ? "Current candle"
          : `Previous ${previousCandles} candle${previousCandles === 1 ? "" : "s"}`

      return `${candleLabel} (${stopLoss.candleAggregation})`
    }
    case "indicator":
      return stopLoss.indicator.trim()
        ? `Indicator ${stopLoss.indicator.trim()}`
        : "Indicator not selected"
    case "percent":
      return `${stopLoss.percentValue || "0"}%`
    case "atr":
      return `ATR ${stopLoss.atrPeriod || "0"} x ${stopLoss.atrMultiplier || "0"}`
  }
}

function summarizeTakeProfitDraft(takeProfit: TakeProfitDraft) {
  switch (takeProfit.type) {
    case "riskReward":
      return `${takeProfit.ratio || "0"}R`
    case "percent":
      return `${takeProfit.percentValue || "0"}%`
    case "indicator":
      return takeProfit.indicator.trim()
        ? `Indicator ${takeProfit.indicator.trim()}`
        : "Indicator not selected"
    case "candle":
      return `Candle ${takeProfit.reference} ${takeProfit.candlePrice}`
  }
}

function DraftLogicWord({ logic }: { logic: "and" | "or" }) {
  return (
    <span
      className={cn(
        "mx-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
        logic === "and" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"
      )}
    >
      {logic}
    </span>
  )
}

function DraftRuleToken({
  node,
  tone,
}: {
  node: ConditionRule
  tone: "buy" | "sell"
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center rounded-2xl border px-2 py-1 text-xs leading-5 font-medium text-foreground",
        tone === "buy"
          ? "border-success/15 bg-success/5"
          : "border-warning/15 bg-warning/5"
      )}
    >
      <span className="break-all">{formatDraftOperand(node.left)}</span>
      <span
        className={cn(
          "mx-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 py-0.5 text-center text-[10px] leading-none font-semibold",
          tone === "buy"
            ? "bg-success/12 text-success"
            : "bg-warning/12 text-warning"
        )}
      >
        {node.operator}
      </span>
      <span className="break-all">{formatDraftOperand(node.right)}</span>
    </span>
  )
}

function DraftRuleExpression({
  node,
  tone,
}: {
  node: ConditionNode
  tone: "buy" | "sell"
}) {
  if (node.type === "group") {
    return (
      <span
        className={cn(
          "inline-flex flex-wrap items-center rounded-2xl border px-2 py-1",
          tone === "buy"
            ? "border-success/15 bg-success/5"
            : "border-warning/15 bg-warning/5"
        )}
      >
        {node.conditions.map((child, index) => (
          <span
            key={`${formatDraftConditionNodeSummary(child)}-${index}`}
            className="inline-flex flex-wrap items-center"
          >
            {index > 0 ? <DraftLogicWord logic={node.logic} /> : null}
            <DraftRuleExpression node={child} tone={tone} />
          </span>
        ))}
      </span>
    )
  }

  return <DraftRuleToken node={node} tone={tone} />
}

function formatDraftConditionNodeSummary(node: ConditionNode): string {
  if (node.type === "group") {
    const nested = node.conditions
      .map((child) => formatDraftConditionNodeSummary(child))
      .filter(Boolean)
      .join(` ${node.logic} `)

    return nested ? `(${nested})` : ""
  }

  return `${formatDraftOperand(node.left)} ${node.operator} ${formatDraftOperand(node.right)}`
}

function DraftRuleSequence({
  nodes,
  logic,
  tone,
}: {
  nodes: ConditionNode[]
  logic: "and" | "or"
  tone: "buy" | "sell"
}) {
  return (
    <div className="text-left leading-7">
      {nodes.map((node, index) => (
        <span
          key={`${formatDraftConditionNodeSummary(node)}-${index}`}
          className="inline-flex flex-wrap items-center"
        >
          {index > 0 ? <DraftLogicWord logic={logic} /> : null}
          <DraftRuleExpression node={node} tone={tone} />
        </span>
      ))}
    </div>
  )
}

function DraftRiskTile({
  label,
  value,
  editContent,
}: {
  label: string
  value: string
  editContent?: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-2",
        label === "Stop Loss"
          ? "border-destructive/20 bg-destructive/8"
          : "border-info/20 bg-info/8"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1 text-sm leading-5 font-medium text-foreground">
            {value}
          </p>
        </div>
        {editContent}
      </div>
    </div>
  )
}

function LogicLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{children}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`${children} help`}
            title={`${children} help`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          className="w-60 p-3 text-xs text-muted-foreground"
        >
          Use <span className="font-medium text-foreground">and</span> when
          every rule must match. Use{" "}
          <span className="font-medium text-foreground">or</span> when any one
          rule can match.
        </PopoverContent>
      </Popover>
    </div>
  )
}

function HelpLabel({
  children,
  content,
}: {
  children: string
  content: ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{children}</Label>
      <AdaptiveTooltipIcon
        label={children}
        content={<div className="space-y-2 text-xs">{content}</div>}
      />
    </div>
  )
}

function ScrollableTextEditor({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  className?: string
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = editorRef.current
    if (!node) return

    if (node.textContent !== value) {
      node.textContent = value
    }
  }, [value])

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/70 bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-background",
        className
      )}
    >
      <ScrollArea className="h-24">
        <div
          id={id}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          className="min-h-full px-2.5 py-2 text-sm break-words whitespace-pre-wrap outline-none"
          onInput={(event) => onChange(event.currentTarget.textContent ?? "")}
        />
      </ScrollArea>
      {!value && (
        <div className="pointer-events-none absolute inset-x-0 top-0 px-2.5 py-2 text-sm text-muted-foreground">
          {placeholder}
        </div>
      )}
    </div>
  )
}

function OperandEditor({
  label,
  value,
  onChange,
  candleOptions,
  indicatorFieldOptions,
}: {
  label: string
  value: OperandDraft
  onChange: (next: OperandDraft) => void
  candleOptions: DropdownOption<string>[]
  indicatorFieldOptions: DropdownOption<string>[]
}) {
  const hasIndicatorOptions =
    indicatorFieldOptions[0]?.value !== EMPTY_INDICATOR_OPTION_VALUE

  return (
    <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:block sm:space-y-2">
        <Label>{label} Type</Label>
        <DropdownField
          value={value.mode}
          onChange={(nextMode) =>
            onChange({
              mode: nextMode,
              value:
                nextMode === "candle"
                  ? (candleOptions[0]?.value ?? "close")
                  : nextMode === "indicator"
                    ? hasIndicatorOptions
                      ? (indicatorFieldOptions[0]?.value ?? "")
                      : ""
                    : value.mode === "number"
                      ? value.value
                      : "",
            })
          }
          options={[
            { label: "Candle", value: "candle" },
            { label: "Indicator", value: "indicator" },
            { label: "Number", value: "number" },
          ]}
        />
      </div>

      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:block sm:space-y-2">
        <Label>{label} Value</Label>
        {value.mode === "candle" ? (
          <DropdownField
            value={value.value}
            onChange={(nextValue) =>
              onChange({
                ...value,
                value: nextValue,
              })
            }
            options={candleOptions}
          />
        ) : value.mode === "indicator" ? (
          <DropdownField
            value={value.value}
            onChange={(nextValue) =>
              nextValue === EMPTY_INDICATOR_OPTION_VALUE
                ? undefined
                : onChange({
                    ...value,
                    value: nextValue,
                  })
            }
            placeholder="No indicators added"
            options={indicatorFieldOptions}
          />
        ) : (
          <Input
            type="text"
            inputMode="decimal"
            value={value.value}
            onChange={(event) =>
              onChange({
                ...value,
                value: sanitizeDecimalInput(event.target.value),
              })
            }
            placeholder="55"
          />
        )}
      </div>
    </div>
  )
}

function ConditionEditor({
  node,
  title,
  candleOptions,
  indicatorFieldOptions,
  onChange,
  onRemove,
}: {
  node: ConditionNode
  title: string
  candleOptions: DropdownOption<string>[]
  indicatorFieldOptions: DropdownOption<string>[]
  onChange: (next: ConditionNode) => void
  onRemove: () => void
}) {
  if (node.type === "group") {
    return (
      <div className="space-y-3 rounded-xl border border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">
              Combine nested rules with shared logic.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive/80"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
            Remove Group
          </Button>
        </div>

        <div className="space-y-3">
          {node.conditions.length > 1 && (
            <div className="space-y-2">
              <LogicLabel>Group Logic</LogicLabel>
              <DropdownField
                value={node.logic}
                onChange={(nextLogic) =>
                  onChange({
                    ...node,
                    logic: nextLogic,
                  })
                }
                options={[
                  { label: "and", value: "and" },
                  { label: "or", value: "or" },
                ]}
              />
            </div>
          )}

          {node.conditions.map((child, index) => (
            <ConditionEditor
              key={child.id}
              node={child}
              title={`Rule ${index + 1}`}
              candleOptions={candleOptions}
              indicatorFieldOptions={indicatorFieldOptions}
              onChange={(next) =>
                onChange({
                  ...node,
                  conditions: node.conditions.map((item) =>
                    item.id === child.id ? next : item
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...node,
                  conditions: removeConditionTree(node.conditions, child.id),
                })
              }
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...node,
                conditions: [...node.conditions, createConditionRule()],
              })
            }
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...node,
                conditions: [...node.conditions, createConditionGroup()],
              })
            }
          >
            <CirclePlus className="h-4 w-4" />
            Add Group
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            Compare a field or indicator key against another field or a number.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
          onClick={onRemove}
          aria-label="Remove rule"
          title="Remove rule"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <OperandEditor
        label="Left"
        value={node.left}
        onChange={(left) =>
          onChange({
            ...node,
            left,
          })
        }
        candleOptions={candleOptions}
        indicatorFieldOptions={indicatorFieldOptions}
      />

      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:block sm:space-y-2">
        <Label>Operator</Label>
        <DropdownField
          value={node.operator}
          onChange={(nextOperator) =>
            onChange({
              ...node,
              operator: nextOperator,
            })
          }
          options={operatorOptions.map((operator) => ({
            label: operator,
            value: operator,
          }))}
        />
      </div>

      <OperandEditor
        label="Right"
        value={node.right}
        onChange={(right) =>
          onChange({
            ...node,
            right,
          })
        }
        candleOptions={candleOptions}
        indicatorFieldOptions={indicatorFieldOptions}
      />
    </div>
  )
}

function StopLossEditor({
  side,
  draft,
  indicatorKeys,
  onChange,
}: {
  side: "buy" | "sell"
  draft: StopLossDraft
  indicatorKeys: string[]
  onChange: (next: StopLossDraft) => void
}) {
  const indicatorDropdownOptions = buildIndicatorDropdownOptions(indicatorKeys)
  const previousCandleCount = Number(draft.previousCandles || "0")
  const isCurrentCandleOnly =
    Number.isInteger(previousCandleCount) && previousCandleCount === 0
  const candleAggregationOptions: Array<
    DropdownOption<StopLossDraft["candleAggregation"]>
  > = [
    { label: "single", value: "single" },
    { label: "min", value: "min", disabled: isCurrentCandleOnly },
    { label: "max", value: "max", disabled: isCurrentCandleOnly },
    {
      label: "average",
      value: "average",
      disabled: isCurrentCandleOnly,
    },
  ]
  const candleSideLabel = side === "buy" ? "low" : "high"
  const candleSourceLabel =
    previousCandleCount === 0
      ? `current entry candle ${candleSideLabel}`
      : previousCandleCount === 1
        ? `previous candle ${candleSideLabel}`
        : `previous ${previousCandleCount} candles ${candleSideLabel}`
  const candleSelectionMessage =
    draft.candleAggregation === "single"
      ? `Selected: ${candleSourceLabel}.`
      : draft.candleAggregation === "min"
        ? `Selected: minimum ${candleSideLabel} from the ${candleSourceLabel}.`
        : draft.candleAggregation === "max"
          ? `Selected: maximum ${candleSideLabel} from the ${candleSourceLabel}.`
          : `Selected: average ${candleSideLabel} from the ${candleSourceLabel}.`

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-2">
        <HelpLabel
          children="Stop Loss Type"
          content={
            <>
              <p>
                <span className="font-semibold text-popover-foreground">
                  Candle
                </span>
                : use current or previous candle lows for buy, and highs for
                sell, with single, min, max, or average calculation.
              </p>
              <p>
                <span className="font-semibold text-popover-foreground">
                  Indicator
                </span>
                : use one of your indicator keys as the stop level.
              </p>
              <p>
                <span className="font-semibold text-popover-foreground">
                  Percent
                </span>
                : place the stop a fixed percent away from entry.
              </p>
              <p>
                <span className="font-semibold text-popover-foreground">
                  ATR
                </span>
                : place the stop by volatility using ATR period and multiplier.
              </p>
            </>
          }
        />
        <DropdownField
          value={draft.type}
          onChange={(nextType) =>
            onChange({
              ...draft,
              type: nextType,
              indicator:
                nextType === "indicator"
                  ? getFirstIndicatorKey(indicatorKeys)
                  : draft.indicator,
            })
          }
          options={[
            { label: "atr", value: "atr" },
            { label: "candle", value: "candle" },
            { label: "indicator", value: "indicator" },
            { label: "percent", value: "percent" },
          ]}
        />
      </div>

      {draft.type === "candle" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {side === "buy"
              ? "Buy stop loss uses candle lows."
              : "Sell stop loss uses candle highs."}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label>Previous Candle Count</Label>
                <AdaptiveTooltipIcon
                  label="Previous Candle Count"
                  content={
                    <>
                      0 = current entry candle.
                      <br />
                      1, 2, 3, 4... = previous candles.
                    </>
                  }
                />
              </div>
              <Input
                type="text"
                inputMode="numeric"
                value={draft.previousCandles}
                onChange={(event) => {
                  const nextPreviousCandles = sanitizeIntegerInput(
                    event.target.value
                  )
                  const nextCount = Number(nextPreviousCandles || "0")

                  onChange({
                    ...draft,
                    previousCandles: nextPreviousCandles,
                    candleAggregation:
                      Number.isInteger(nextCount) && nextCount === 0
                        ? "single"
                        : draft.candleAggregation,
                  })
                }}
                placeholder="0"
              />
              <p className="hidden text-xs text-muted-foreground md:block">
                {candleSelectionMessage}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label>Calculation</Label>
                <AdaptiveTooltipIcon
                  label="Calculation"
                  content={
                    <>
                      Single = one candle value.
                      <br />
                      Min, Max, Average = from selected candles.
                    </>
                  }
                />
              </div>
              <DropdownField
                value={draft.candleAggregation}
                onChange={(nextAggregation) =>
                  onChange({
                    ...draft,
                    candleAggregation: nextAggregation,
                  })
                }
                options={candleAggregationOptions}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground md:hidden">
            {candleSelectionMessage}
          </p>
        </div>
      )}

      {draft.type === "indicator" && (
        <div className="space-y-2">
          <Label>Indicator Key</Label>
          <DropdownField
            value={draft.indicator}
            onChange={(nextIndicator) =>
              nextIndicator === EMPTY_INDICATOR_OPTION_VALUE
                ? undefined
                : onChange({
                    ...draft,
                    indicator: nextIndicator,
                  })
            }
            placeholder="No indicators added"
            options={indicatorDropdownOptions}
          />
        </div>
      )}

      {draft.type === "percent" && (
        <div className="space-y-2">
          <Label>Percent</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={draft.percentValue}
            onChange={(event) =>
              onChange({
                ...draft,
                percentValue: sanitizeDecimalInput(event.target.value),
              })
            }
            placeholder="1"
          />
        </div>
      )}

      {draft.type === "atr" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>ATR Period</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={draft.atrPeriod}
              onChange={(event) =>
                onChange({
                  ...draft,
                  atrPeriod: sanitizeIntegerInput(event.target.value),
                })
              }
              placeholder="14"
            />
          </div>
          <div className="space-y-2">
            <Label>Multiplier</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={draft.atrMultiplier}
              onChange={(event) =>
                onChange({
                  ...draft,
                  atrMultiplier: sanitizeDecimalInput(event.target.value),
                })
              }
              placeholder="2"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TakeProfitEditor({
  draft,
  indicatorKeys,
  onChange,
}: {
  draft: TakeProfitDraft
  indicatorKeys: string[]
  onChange: (next: TakeProfitDraft) => void
}) {
  const indicatorDropdownOptions = buildIndicatorDropdownOptions(indicatorKeys)

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-2">
        <HelpLabel
          children="Take Profit Type"
          content={
            <>
              <p>
                <span className="font-medium text-foreground">Risk Reward</span>
                : set take profit by a reward ratio from your stop distance.
              </p>
              <p>
                <span className="font-medium text-foreground">Percent</span>:
                place take profit a fixed percent away from entry.
              </p>
              <p>
                <span className="font-medium text-foreground">Indicator</span>:
                use one of your indicator keys as the target.
              </p>
              <p>
                <span className="font-medium text-foreground">Candle</span>: use
                a candle price like previous high or current close.
              </p>
            </>
          }
        />
        <DropdownField
          value={draft.type}
          onChange={(nextType) =>
            onChange({
              ...draft,
              type: nextType,
              indicator:
                nextType === "indicator"
                  ? getFirstIndicatorKey(indicatorKeys)
                  : draft.indicator,
            })
          }
          options={[
            { label: "candle", value: "candle" },
            { label: "indicator", value: "indicator" },
            { label: "percent", value: "percent" },
            { label: "riskReward", value: "riskReward" },
          ]}
        />
      </div>

      {draft.type === "riskReward" && (
        <div className="space-y-2">
          <Label>Risk Reward Ratio</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={draft.ratio}
            onChange={(event) =>
              onChange({
                ...draft,
                ratio: sanitizeDecimalInput(event.target.value),
              })
            }
            placeholder="2"
          />
        </div>
      )}

      {draft.type === "percent" && (
        <div className="space-y-2">
          <Label>Percent</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={draft.percentValue}
            onChange={(event) =>
              onChange({
                ...draft,
                percentValue: sanitizeDecimalInput(event.target.value),
              })
            }
            placeholder="3"
          />
        </div>
      )}

      {draft.type === "indicator" && (
        <div className="space-y-2">
          <Label>Indicator Key</Label>
          <DropdownField
            value={draft.indicator}
            onChange={(nextIndicator) =>
              nextIndicator === EMPTY_INDICATOR_OPTION_VALUE
                ? undefined
                : onChange({
                    ...draft,
                    indicator: nextIndicator,
                  })
            }
            placeholder="No indicators added"
            options={indicatorDropdownOptions}
          />
        </div>
      )}

      {draft.type === "candle" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Reference</Label>
            <DropdownField
              value={draft.reference}
              onChange={(nextReference) =>
                onChange({
                  ...draft,
                  reference: nextReference,
                })
              }
              options={[
                { label: "previous", value: "previous" },
                { label: "current", value: "current" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label>Candle Price</Label>
            <DropdownField
              value={draft.candlePrice}
              onChange={(nextPrice) =>
                onChange({
                  ...draft,
                  candlePrice: nextPrice,
                })
              }
              options={["open", "high", "low", "close"].map((item) => ({
                label: item,
                value: item as TakeProfitDraft["candlePrice"],
              }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function LogicBlockEditor({
  title,
  description,
  draft,
  candleOptions,
  indicatorFieldOptions,
  indicatorKeys,
  onChange,
}: {
  title: string
  description: string
  draft: LogicBlockDraft
  candleOptions: DropdownOption<string>[]
  indicatorFieldOptions: DropdownOption<string>[]
  indicatorKeys: string[]
  onChange: (next: LogicBlockDraft) => void
}) {
  const ruleCount = countConditionNodes(draft.conditions)
  const sideLabel = title.replace(/\s+Entry$/, "")
  const tone = sideLabel.toLowerCase() === "buy" ? "buy" : "sell"
  const isBuy = tone === "buy"
  const shouldScrollEntryEditor = draft.conditions.length > 1
  const entrySummary = summarizeRuleCount(ruleCount)

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-4 sm:p-5",
        isBuy ? "theme-rule-panel-buy" : "theme-rule-panel-sell"
      )}
    >
      <div className="theme-hero-sheen absolute inset-x-0 top-0 h-px" />
      <div className="relative space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] uppercase",
                isBuy
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-warning/20 bg-warning/10 text-warning"
              )}
            >
              {isBuy ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {title}
            </span>
            <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              {entrySummary}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/15 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Rules
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 rounded-full border border-border/70 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label="Edit rules"
                  title="Edit rules"
                >
                  <Settings2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent
                onOpenAutoFocus={(event) => event.preventDefault()}
                className={cn(
                  "top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10vh] sm:max-w-[560px]",
                  shouldScrollEntryEditor && "overflow-hidden p-0",
                  !shouldScrollEntryEditor && "p-0"
                )}
              >
                <DialogHeader className="border-b px-4 pt-4 pb-3">
                  <DialogTitle>{title} Rule</DialogTitle>
                  <DialogDescription>
                    Configure root logic and conditions.
                  </DialogDescription>
                </DialogHeader>
                {shouldScrollEntryEditor ? (
                  <ScrollArea className="h-[min(78vh,36rem)]">
                    <div className="space-y-4 p-4">
                      <div className="space-y-3">
                        {draft.conditions.length > 1 && (
                          <div className="space-y-2">
                            <LogicLabel>Root Logic</LogicLabel>
                            <DropdownField
                              value={draft.logic}
                              onChange={(nextLogic) =>
                                onChange({
                                  ...draft,
                                  logic: nextLogic,
                                })
                              }
                              options={[
                                { label: "and", value: "and" },
                                { label: "or", value: "or" },
                              ]}
                            />
                          </div>
                        )}

                        {draft.conditions.map((condition, index) => (
                          <ConditionEditor
                            key={condition.id}
                            node={condition}
                            title={`Rule ${index + 1}`}
                            candleOptions={candleOptions}
                            indicatorFieldOptions={indicatorFieldOptions}
                            onChange={(next) =>
                              onChange({
                                ...draft,
                                conditions: draft.conditions.map((item) =>
                                  item.id === condition.id ? next : item
                                ),
                              })
                            }
                            onRemove={() =>
                              onChange({
                                ...draft,
                                conditions: removeConditionTree(
                                  draft.conditions,
                                  condition.id
                                ),
                              })
                            }
                          />
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            onChange({
                              ...draft,
                              conditions: [
                                ...draft.conditions,
                                createConditionRule(),
                              ],
                            })
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Add Rule
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            onChange({
                              ...draft,
                              conditions: [
                                ...draft.conditions,
                                createConditionGroup(),
                              ],
                            })
                          }
                        >
                          <CirclePlus className="h-4 w-4" />
                          Add Group
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="space-y-4 p-4">
                    <div className="space-y-3">
                      {draft.conditions.length > 1 && (
                        <div className="space-y-2">
                          <LogicLabel>Root Logic</LogicLabel>
                          <DropdownField
                            value={draft.logic}
                            onChange={(nextLogic) =>
                              onChange({
                                ...draft,
                                logic: nextLogic,
                              })
                            }
                            options={[
                              { label: "and", value: "and" },
                              { label: "or", value: "or" },
                            ]}
                          />
                        </div>
                      )}

                      {draft.conditions.map((condition, index) => (
                        <ConditionEditor
                          key={condition.id}
                          node={condition}
                          title={`Rule ${index + 1}`}
                          candleOptions={candleOptions}
                          indicatorFieldOptions={indicatorFieldOptions}
                          onChange={(next) =>
                            onChange({
                              ...draft,
                              conditions: draft.conditions.map((item) =>
                                item.id === condition.id ? next : item
                              ),
                            })
                          }
                          onRemove={() =>
                            onChange({
                              ...draft,
                              conditions: removeConditionTree(
                                draft.conditions,
                                condition.id
                              ),
                            })
                          }
                        />
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          onChange({
                            ...draft,
                            conditions: [
                              ...draft.conditions,
                              createConditionRule(),
                            ],
                          })
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Add Rule
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          onChange({
                            ...draft,
                            conditions: [
                              ...draft.conditions,
                              createConditionGroup(),
                            ],
                          })
                        }
                      >
                        <CirclePlus className="h-4 w-4" />
                        Add Group
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-2.5">
            <DraftRuleSequence
              nodes={draft.conditions}
              logic={draft.logic}
              tone={tone}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DraftRiskTile
            label="Stop Loss"
            value={summarizeStopLossDraft(draft.riskManagement.stopLoss)}
            editContent={
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 rounded-full border border-border/70 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label="Edit stop loss"
                    title="Edit stop loss"
                  >
                    <Settings2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10vh] sm:max-w-[420px]"
                >
                  <DialogHeader className="border-b px-4 pt-4 pb-3">
                    <DialogTitle>{sideLabel} Stop Loss</DialogTitle>
                    <DialogDescription>
                      Configure stop loss behavior.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 p-4">
                    <StopLossEditor
                      side={sideLabel.toLowerCase() === "buy" ? "buy" : "sell"}
                      draft={draft.riskManagement.stopLoss}
                      indicatorKeys={indicatorKeys}
                      onChange={(stopLoss) =>
                        onChange({
                          ...draft,
                          riskManagement: {
                            ...draft.riskManagement,
                            stopLoss,
                          },
                        })
                      }
                    />
                  </div>
                </DialogContent>
              </Dialog>
            }
          />
          <DraftRiskTile
            label="Take Profit"
            value={summarizeTakeProfitDraft(draft.riskManagement.takeProfit)}
            editContent={
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 rounded-full border border-border/70 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label="Edit take profit"
                    title="Edit take profit"
                  >
                    <Settings2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10vh] sm:max-w-[420px]"
                >
                  <DialogHeader className="border-b px-4 pt-4 pb-3">
                    <DialogTitle>{sideLabel} Take Profit</DialogTitle>
                    <DialogDescription>
                      Configure take profit behavior.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 p-4">
                    <TakeProfitEditor
                      draft={draft.riskManagement.takeProfit}
                      indicatorKeys={indicatorKeys}
                      onChange={(takeProfit) =>
                        onChange({
                          ...draft,
                          riskManagement: {
                            ...draft.riskManagement,
                            takeProfit,
                          },
                        })
                      }
                    />
                  </div>
                </DialogContent>
              </Dialog>
            }
          />
        </div>
      </div>
    </section>
  )
}

export default function StrategyEditorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { strategyId = "" } = useParams()
  const isEditing = Boolean(strategyId)
  const duplicateStrategyId =
    typeof location.state === "object" &&
    location.state !== null &&
    "duplicateStrategyId" in location.state &&
    typeof (location.state as { duplicateStrategyId?: unknown })
      .duplicateStrategyId === "string"
      ? (location.state as { duplicateStrategyId: string }).duplicateStrategyId
      : ""
  const isDuplicating = !isEditing && Boolean(duplicateStrategyId)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [indicatorSearch, setIndicatorSearch] = useState("")
  const [debouncedIndicatorSearch, setDebouncedIndicatorSearch] = useState("")
  const [indicatorCategory, setIndicatorCategory] = useState<
    IndicatorCategory | "all"
  >("all")
  const [indicatorSortBy, setIndicatorSortBy] =
    useState<IndicatorSortField>("name")
  const [indicatorOrder, setIndicatorOrder] = useState<SortOrder>("asc")
  const [isIndicatorMenuOpen, setIsIndicatorMenuOpen] = useState(false)
  const [indicatorPage, setIndicatorPage] = useState(1)
  const [indicatorHasNextPage, setIndicatorHasNextPage] = useState(false)
  const [isAppendingIndicators, setIsAppendingIndicators] = useState(false)
  const [indicatorOptions, setIndicatorOptions] = useState<
    IndicatorDefinition[]
  >([])
  const [indicatorDrafts, setIndicatorDrafts] = useState<IndicatorDraft[]>([])
  const [buyDraft, setBuyDraft] = useState<LogicBlockDraft>(
    createLogicBlockDraft()
  )
  const [sellDraft, setSellDraft] = useState<LogicBlockDraft>(
    createLogicBlockDraft()
  )
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(true)
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(isEditing)
  const [initialPayloadSnapshot, setInitialPayloadSnapshot] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedIndicatorSearch(indicatorSearch)
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [indicatorSearch])

  useEffect(() => {
    const loadIndicators = async () => {
      if (indicatorPage === 1) {
        setIsLoadingIndicators(true)
      } else {
        setIsAppendingIndicators(true)
      }

      try {
        const response = await fetchIndicatorsOnce({
          page: indicatorPage,
          search: debouncedIndicatorSearch.trim(),
          sortBy: indicatorSortBy,
          order: indicatorOrder,
          category: indicatorCategory === "all" ? undefined : indicatorCategory,
        })

        const items = response?.result?.indicators ?? []
        setIndicatorOptions((prev) => {
          const selectedIndicatorIds = new Set(
            indicatorDrafts
              .map((draft) => draft.indicator)
              .filter((value): value is string => Boolean(value))
          )

          if (indicatorPage === 1) {
            return Array.from(
              new Map(
                [
                  ...prev.filter((item) => selectedIndicatorIds.has(item._id)),
                  ...items,
                ].map((item) => [item._id, item])
              ).values()
            )
          }

          return Array.from(
            new Map(
              [...prev, ...items].map((item) => [item._id, item])
            ).values()
          )
        })
        setIndicatorHasNextPage(Boolean(response?.result?.hasNextPage))
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load indicators"))
      } finally {
        setIsLoadingIndicators(false)
        setIsAppendingIndicators(false)
      }
    }

    void loadIndicators()
  }, [
    debouncedIndicatorSearch,
    indicatorCategory,
    indicatorDrafts,
    indicatorOrder,
    indicatorPage,
    indicatorSortBy,
  ])

  useEffect(() => {
    const sourceStrategyId = strategyId || duplicateStrategyId

    if (!sourceStrategyId) {
      setIsLoadingStrategy(false)
      return
    }

    const loadStrategy = async () => {
      setIsLoadingStrategy(true)

      try {
        const response = (await fetchStrategyById(
          sourceStrategyId
        )) as StrategyDetailResponse
        const strategy = response?.result?.strategy

        if (!strategy) {
          toast.error("Strategy not found")
          navigate("/strategy")
          return
        }

        setName(
          isDuplicating
            ? `${strategy.name?.trim() || "Strategy"} - Clone`
            : (strategy.name ?? "")
        )
        setDescription(strategy.description ?? "")
        setIsPublic(strategy.isPublic ?? true)

        const nextDrafts =
          strategy.indicators?.reduce<IndicatorDraft[]>((drafts, item) => {
            const indicatorId = item.indicator?._id ?? ""
            const indicatorName =
              item.indicator?.name?.trim() || `indicator_${drafts.length + 1}`
            const params = createParamDrafts(item.params)

            drafts.push({
              id: createId(),
              indicator: indicatorId,
              indicatorName,
              indicatorDescription: item.indicator?.description ?? "",
              key:
                item.key?.trim() ||
                buildUniqueIndicatorKey(indicatorName, params, drafts),
              source: item.source ?? "close",
              params,
            })

            return drafts
          }, []) ?? []

        setIndicatorDrafts(nextDrafts)
        setBuyDraft(deserializeLogicBlock(strategy.entry?.buy))
        setSellDraft(deserializeLogicBlock(strategy.entry?.sell))
        setInitialPayloadSnapshot(
          isEditing
            ? JSON.stringify({
                name: strategy.name?.trim() ?? "",
                description: strategy.description?.trim() ?? "",
                isPublic: strategy.isPublic ?? true,
                indicators: nextDrafts.map((draft) => ({
                  indicator: draft.indicator,
                  key: draft.key.trim(),
                  source: draft.source,
                  params: Object.fromEntries(
                    draft.params.map((param) => [
                      param.key.trim(),
                      param.type === "number"
                        ? Number(param.value)
                        : param.type === "boolean"
                          ? param.value === "true"
                          : param.value,
                    ])
                  ),
                })),
                entry: {
                  buy:
                    strategy.entry?.buy ??
                    serializeLogicBlock(createLogicBlockDraft()),
                  sell:
                    strategy.entry?.sell ??
                    serializeLogicBlock(createLogicBlockDraft()),
                },
              })
            : ""
        )

        setIndicatorOptions((prev) =>
          Array.from(
            new Map(
              [
                ...prev,
                ...(strategy.indicators ?? []).flatMap((item) => {
                  if (!item.indicator?._id || !item.indicator?.name) {
                    return []
                  }

                  return [
                    {
                      _id: item.indicator._id,
                      name: item.indicator.name,
                      description: item.indicator.description ?? "",
                      category:
                        item.indicator.category ??
                        ("trend" as IndicatorCategory),
                      source: item.source,
                      params: item.params,
                    },
                  ]
                }),
              ].map((item) => [item._id, item])
            ).values()
          )
        )
      } catch (error: unknown) {
        const responseMessage =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } })
                .response!.data!.message
            : null

        toast.error(
          responseMessage ??
            (error instanceof Error ? error.message : "Failed to load strategy")
        )
        navigate("/strategy")
      } finally {
        setIsLoadingStrategy(false)
      }
    }

    void loadStrategy()
  }, [duplicateStrategyId, isEditing, navigate, strategyId])

  const indicatorMap = useMemo(
    () => new Map(indicatorOptions.map((item) => [item._id, item])),
    [indicatorOptions]
  )

  const indicatorKeys = useMemo(
    () =>
      indicatorDrafts.flatMap((item) =>
        getIndicatorOutputKeys(item).filter(
          (indicatorKey): indicatorKey is string => Boolean(indicatorKey)
        )
      ),
    [indicatorDrafts]
  )

  const candleOptions = useMemo(
    () =>
      sourceOptions.map((item) => ({
        label: item,
        value: item,
      })),
    []
  )

  const indicatorFieldOptions = useMemo(
    () => buildIndicatorDropdownOptions(indicatorKeys),
    [indicatorKeys]
  )

  const updateIndicatorDraft = (
    draftId: string,
    updater: (draft: IndicatorDraft) => IndicatorDraft
  ) => {
    setIndicatorDrafts((prev) =>
      prev.map((draft) => (draft.id === draftId ? updater(draft) : draft))
    )
  }

  const appendIndicatorDraft = (indicatorId: string) => {
    const selected = indicatorMap.get(indicatorId)
    if (!selected) return

    const nextParams = createParamDrafts(selected.params)
    setIndicatorDrafts((prev) => [
      ...prev,
      {
        id: createId(),
        indicator: indicatorId,
        indicatorName: selected.name,
        indicatorDescription: selected.description,
        key: buildUniqueIndicatorKey(selected.name, nextParams, prev),
        source: selected.source ?? "close",
        params: nextParams,
      },
    ])
    setIsIndicatorMenuOpen(false)
    setIndicatorSearch("")
    setIndicatorPage(1)
  }

  const serializeParams = (params: ParamDraft[]) => {
    const output: Record<string, unknown> = {}

    for (const param of params) {
      if (!param.key.trim()) {
        throw new Error("Indicator param name is required")
      }

      if (param.type === "number") {
        const numeric = Number(param.value)
        if (Number.isNaN(numeric)) {
          throw new Error(`Param "${param.key}" must be a valid number`)
        }
        output[param.key.trim()] = numeric
        continue
      }

      if (param.type === "boolean") {
        output[param.key.trim()] = param.value === "true"
        continue
      }

      output[param.key.trim()] = param.value
    }

    return output
  }

  const buildStrategyPayload = (): CreateStrategyPayload => ({
    name: name.trim(),
    description: description.trim(),
    isPublic,
    indicators: indicatorDrafts.map((draft) => {
      if (!draft.indicator) {
        throw new Error("Please select an indicator for every row")
      }

      if (!draft.key.trim()) {
        throw new Error("Every indicator needs a key")
      }

      return {
        indicator: draft.indicator,
        key: draft.key.trim(),
        source: draft.source,
        params: serializeParams(draft.params),
      }
    }),
    entry: {
      buy: serializeLogicBlock(buyDraft),
      sell: serializeLogicBlock(sellDraft),
    },
  })

  const formValidationError = useMemo(() => {
    if (name.trim().length < 2) {
      return "Strategy name must be at least 2 characters"
    }

    try {
      indicatorDrafts.forEach((draft) => {
        if (!draft.indicator) {
          throw new Error("Please select an indicator for every row")
        }

        if (!draft.key.trim()) {
          throw new Error("Every indicator needs a key")
        }

        serializeParams(draft.params)
      })

      buildStrategyPayload()

      return null
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Strategy is not valid yet"
    }
  }, [name, description, isPublic, indicatorDrafts, buyDraft, sellDraft])

  const hasChanges = useMemo(() => {
    if (!isEditing || isLoadingStrategy || formValidationError) {
      return !isEditing
    }

    try {
      return JSON.stringify(buildStrategyPayload()) !== initialPayloadSnapshot
    } catch {
      return false
    }
  }, [
    isEditing,
    isLoadingStrategy,
    formValidationError,
    initialPayloadSnapshot,
    name,
    description,
    isPublic,
    indicatorDrafts,
    buyDraft,
    sellDraft,
  ])

  const handleSubmit = async () => {
    if (formValidationError) {
      toast.error(formValidationError)
      return
    }

    if (isEditing && !hasChanges) {
      return
    }

    try {
      const payload = buildStrategyPayload()

      setIsSubmitting(true)
      const response = isEditing
        ? await updateStrategy(strategyId, payload)
        : await createStrategy(payload)
      const nextStrategyId = response?.result?.strategy?._id || strategyId

      toast.success(
        isEditing
          ? "Strategy updated successfully"
          : "Strategy created successfully"
      )

      if (nextStrategyId) {
        navigate(`/strategy/${nextStrategyId}`)
        return
      }

      navigate("/strategy")
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(
          error,
          isEditing ? "Failed to update strategy" : "Failed to create strategy"
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
                return
              }

              navigate("/strategy")
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back
            </span>
          </Button>

          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase">
              <Settings2 className="h-3.5 w-3.5" />
              Strategy Builder
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
              {isEditing
                ? "Edit Strategy"
                : isDuplicating
                  ? "Clone Strategy"
                  : "Create Strategy"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
              {isEditing
                ? "Update your strategy with friendly form controls for indicators, nested conditions, stop loss, and take profit."
                : isDuplicating
                  ? "Clone this strategy into your own draft, make your changes, and save it as your own."
                  : "Build a strategy with friendly form controls for indicators, nested conditions, stop loss, and take profit. No JSON needed."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Set the public details for this strategy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strategy-name">Strategy Name</Label>
                <Input
                  id="strategy-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter strategy name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="strategy-description">Description</Label>
                <ScrollableTextEditor
                  id="strategy-description"
                  value={description}
                  onChange={setDescription}
                  placeholder="Buy on bullish EMA crossover with RSI confirmation, sell on bearish crossover."
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  {isPublic ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {isPublic ? "Public" : "Private"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPublic
                        ? "Anyone can discover this strategy."
                        : "Only you can access this strategy."}
                    </p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Indicators</CardTitle>
                  <CardDescription>
                    Search indicators and click one to add it instantly.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Add Indicator</Label>
                <Dialog
                  open={isIndicatorMenuOpen}
                  onOpenChange={(open) => {
                    setIsIndicatorMenuOpen(open)
                    if (open) {
                      setIndicatorPage(1)
                    }
                    if (!open) {
                      setIndicatorSearch("")
                      setIndicatorCategory("all")
                      setIndicatorSortBy("name")
                      setIndicatorOrder("asc")
                      setIndicatorPage(1)
                      setIsAppendingIndicators(false)
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "relative w-full justify-start overflow-hidden pr-10 text-left",
                        !isLoadingIndicators && "text-muted-foreground"
                      )}
                    >
                      <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {isLoadingIndicators
                          ? "Loading indicators..."
                          : "Search and add indicator"}
                      </span>
                      <ChevronsUpDown className="absolute top-1/2 right-3 h-4 w-4 shrink-0 -translate-y-1/2 opacity-50" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent
                    className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10vh] sm:max-w-2xl"
                    onOpenAutoFocus={(event) => {
                      event.preventDefault()
                    }}
                  >
                    <DialogHeader className="border-b px-4 pt-4 pb-3">
                      <DialogTitle>Select indicator</DialogTitle>
                      <DialogDescription>
                        Search indicators and click one to add it instantly.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 px-4 py-4">
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={indicatorSearch}
                          onChange={(event) => {
                            setIndicatorSearch(event.target.value)
                            setIndicatorPage(1)
                          }}
                          placeholder="Search"
                          className="h-9 w-full pr-10 pl-7"
                        />
                        <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center">
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
                              onClick={(event) => event.stopPropagation()}
                            >
                              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={indicatorSortBy}
                                onValueChange={(value) => {
                                  const nextSortBy = value as IndicatorSortField
                                  setIndicatorSortBy(nextSortBy)
                                  if (nextSortBy === "createdAt") {
                                    setIndicatorOrder("desc")
                                  }
                                  if (nextSortBy === "name") {
                                    setIndicatorOrder("asc")
                                  }
                                  setIndicatorPage(1)
                                }}
                              >
                                {indicatorSortOptions.map((option) => (
                                  <DropdownMenuRadioItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Order</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={indicatorOrder}
                                onValueChange={(value) => {
                                  setIndicatorOrder(value as SortOrder)
                                  setIndicatorPage(1)
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
                        {indicatorCategoryOptions.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={
                              indicatorCategory === option.value
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            className="h-7 rounded-full px-2.5 text-[11px]"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setIndicatorCategory(option.value)
                              setIndicatorPage(1)
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {indicatorOptions.length === 0 ? (
                      <p className="px-4 pb-4 text-xs text-muted-foreground">
                        No indicators found.
                      </p>
                    ) : (
                      <ScrollArea
                        className={cn(
                          "px-4 pb-4",
                          indicatorOptions.length > 4 && "h-[320px]"
                        )}
                        onScrollCapture={(event) => {
                          const node = event.target as HTMLElement
                          const distanceToBottom =
                            node.scrollHeight -
                            node.scrollTop -
                            node.clientHeight

                          if (
                            distanceToBottom < 24 &&
                            indicatorHasNextPage &&
                            !isLoadingIndicators &&
                            !isAppendingIndicators
                          ) {
                            setIndicatorPage((prev) => prev + 1)
                          }
                        }}
                      >
                        <div className="space-y-1">
                          {indicatorOptions.map((item) => (
                            <div
                              key={item._id}
                              role="button"
                              tabIndex={0}
                              className="rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2 text-left transition-colors hover:bg-accent/40"
                              onClick={() => {
                                appendIndicatorDraft(item._id)
                                setIsIndicatorMenuOpen(false)
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) {
                                  return
                                }

                                event.preventDefault()
                                appendIndicatorDraft(item._id)
                                setIsIndicatorMenuOpen(false)
                              }}
                            >
                              <span className="block w-full truncate text-sm">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  - {item.description}
                                </span>
                              </span>
                            </div>
                          ))}
                          {indicatorHasNextPage ? (
                            <div className="flex h-10 items-center justify-center">
                              {isAppendingIndicators ? (
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

              {indicatorDrafts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No indicators added yet. Open the dropdown above and choose
                  one.
                </div>
              ) : (
                indicatorDrafts.map((draft, index) => {
                  const paramSummary = summarizeIndicatorParams(draft.params)

                  return (
                    <div
                      key={draft.id}
                      className="relative flex flex-col gap-3 rounded-xl border px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-2 right-2 text-destructive hover:text-destructive/80"
                        onClick={() =>
                          setIndicatorDrafts((prev) =>
                            prev.filter((item) => item.id !== draft.id)
                          )
                        }
                        aria-label={`Remove indicator ${index + 1}`}
                        title="Remove indicator"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-start gap-2 pr-10">
                          <span className="inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium text-muted-foreground">
                            Indicator {index + 1}
                          </span>
                          <span className="text-sm font-medium break-words">
                            {draft.indicatorName || "Unknown indicator"}
                          </span>
                          <span className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {draft.source}
                          </span>
                          <span className="inline-flex max-w-full items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] break-all text-muted-foreground">
                            {draft.key}
                          </span>
                        </div>

                        <p className="text-xs break-words text-muted-foreground">
                          {draft.indicatorDescription ||
                            "Edit this indicator to configure its params."}
                        </p>

                        <p className="text-xs break-words text-muted-foreground">
                          {paramSummary}
                        </p>
                      </div>

                      <div className="flex w-full self-start sm:w-auto sm:self-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              aria-label={`Edit indicator ${index + 1}`}
                              title="Edit indicator"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            onOpenAutoFocus={(event) => event.preventDefault()}
                            className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10vh] sm:max-w-[420px]"
                          >
                            <DialogHeader className="border-b px-4 pt-4 pb-3">
                              <DialogTitle>
                                {draft.indicatorName || "Indicator"}
                              </DialogTitle>
                              <DialogDescription className="break-words">
                                {draft.indicatorDescription ||
                                  "Edit indicator source and parameter values."}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 p-4">

                              <div className="grid items-center gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-3">
                                <div>
                                  <Label>source</Label>
                                </div>
                                <div className="sm:max-w-[180px]">
                                  <DropdownField
                                    value={draft.source}
                                    onChange={(nextSource) =>
                                      updateIndicatorDraft(
                                        draft.id,
                                        (current) => ({
                                          ...current,
                                          source: nextSource,
                                        })
                                      )
                                    }
                                    options={sourceOptions.map((source) => ({
                                      label: source,
                                      value: source,
                                    }))}
                                  />
                                </div>
                              </div>

                              {draft.params.length > 0 && (
                                <div className="space-y-3">
                                  <Label>Parameters</Label>
                                  <div className="space-y-2 rounded-lg border p-3">
                                    {draft.params.map((param) =>
                                      (() => {
                                        const paramHelpText = getParamHelpText(
                                          param.key
                                        )

                                        return (
                                          <div
                                            key={param.id}
                                            className={cn(
                                              "grid items-center gap-1.5 sm:gap-2",
                                              param.type === "boolean"
                                                ? "grid-cols-[minmax(0,1fr)_auto]"
                                                : "sm:grid-cols-[minmax(0,1fr)_minmax(120px,160px)]"
                                            )}
                                          >
                                            <div>
                                              <div className="flex min-h-8 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-foreground">
                                                <span>{param.key}</span>
                                                {paramHelpText && (
                                                  <ParamHelpTooltip
                                                    label={param.key}
                                                    content={paramHelpText}
                                                  />
                                                )}
                                              </div>
                                            </div>

                                            <div
                                              className={
                                                param.type === "boolean"
                                                  ? "w-fit"
                                                  : "sm:max-w-[160px]"
                                              }
                                            >
                                              {param.type === "boolean" ? (
                                                <div className="flex h-8 items-center">
                                                  <Switch
                                                    checked={
                                                      param.value === "true"
                                                    }
                                                    onCheckedChange={(
                                                      checked
                                                    ) =>
                                                      updateIndicatorDraft(
                                                        draft.id,
                                                        (current) => {
                                                          const params =
                                                            current.params.map(
                                                              (item) =>
                                                                item.id ===
                                                                param.id
                                                                  ? {
                                                                      ...item,
                                                                      value:
                                                                        checked
                                                                          ? "true"
                                                                          : "false",
                                                                    }
                                                                  : item
                                                            )
                                                          const indicatorName =
                                                            current.indicatorName ??
                                                            ""

                                                          return {
                                                            ...current,
                                                            params,
                                                            key: indicatorName
                                                              ? buildUniqueIndicatorKey(
                                                                  indicatorName,
                                                                  params,
                                                                  indicatorDrafts,
                                                                  current.id
                                                                )
                                                              : current.key,
                                                          }
                                                        }
                                                      )
                                                    }
                                                  />
                                                </div>
                                              ) : (
                                                <Input
                                                  className="h-8"
                                                  value={param.value}
                                                  onChange={(event) =>
                                                    updateIndicatorDraft(
                                                      draft.id,
                                                      (current) => {
                                                        const params =
                                                          current.params.map(
                                                            (item) =>
                                                              item.id ===
                                                              param.id
                                                                ? {
                                                                    ...item,
                                                                    value:
                                                                      param.type ===
                                                                      "number"
                                                                        ? sanitizeDecimalInput(
                                                                            event
                                                                              .target
                                                                              .value
                                                                          )
                                                                        : event
                                                                            .target
                                                                            .value,
                                                                  }
                                                                : item
                                                          )
                                                        const indicatorName =
                                                          current.indicatorName ??
                                                          ""

                                                        return {
                                                          ...current,
                                                          params,
                                                          key: indicatorName
                                                            ? buildUniqueIndicatorKey(
                                                                indicatorName,
                                                                params,
                                                                indicatorDrafts,
                                                                current.id
                                                              )
                                                            : current.key,
                                                        }
                                                      }
                                                    )
                                                  }
                                                  onBlur={() =>
                                                    updateIndicatorDraft(
                                                      draft.id,
                                                      (current) => {
                                                        const params =
                                                          current.params.map(
                                                            (item) =>
                                                              item.id ===
                                                              param.id
                                                                ? {
                                                                    ...item,
                                                                    value:
                                                                      param.type ===
                                                                      "number"
                                                                        ? fallbackInputValue(
                                                                            item.value,
                                                                            item.defaultValue
                                                                          )
                                                                        : item.value,
                                                                  }
                                                                : item
                                                          )
                                                        const indicatorName =
                                                          current.indicatorName ??
                                                          ""

                                                        return {
                                                          ...current,
                                                          params,
                                                          key: indicatorName
                                                            ? buildUniqueIndicatorKey(
                                                                indicatorName,
                                                                params,
                                                                indicatorDrafts,
                                                                current.id
                                                              )
                                                            : current.key,
                                                        }
                                                      }
                                                    )
                                                  }
                                                  placeholder={
                                                    param.defaultValue ||
                                                    "value"
                                                  }
                                                />
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })()
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <LogicBlockEditor
            title="Buy Entry"
            description="Set the buy-side root logic, nested conditions, and risk management."
            draft={buyDraft}
            candleOptions={candleOptions}
            indicatorFieldOptions={indicatorFieldOptions}
            indicatorKeys={indicatorKeys}
            onChange={setBuyDraft}
          />

          <LogicBlockEditor
            title="Sell Entry"
            description="Set the sell-side root logic, nested conditions, and risk management."
            draft={sellDraft}
            candleOptions={candleOptions}
            indicatorFieldOptions={indicatorFieldOptions}
            indicatorKeys={indicatorKeys}
            onChange={setSellDraft}
          />

          <Card>
            <CardHeader>
              <CardTitle>Builder Notes</CardTitle>
              <CardDescription>
                A few quick reminders while building your strategy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Settings2 className="mt-0.5 h-4 w-4 shrink-0" />
                Indicator keys are generated for you and update automatically
                when indicator params change.
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Add groups when you need nested logic. Use the help icon beside
                logic fields to understand `and` and `or`.
              </p>
              <p className="flex items-start gap-2">
                <CirclePlus className="mt-0.5 h-4 w-4 shrink-0" />
                Add indicators when you want to reference them in entry, stop
                loss, and take profit selections.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Save Strategy</CardTitle>
              <CardDescription>
                {isDuplicating
                  ? "Save this cloned strategy as your own when everything looks good."
                  : "Save your strategy when everything looks good."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                className="w-full"
                onClick={() => void handleSubmit()}
                disabled={
                  isSubmitting ||
                  isLoadingStrategy ||
                  isLoadingIndicators ||
                  Boolean(formValidationError) ||
                  (isEditing && !hasChanges)
                }
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEditing
                  ? "Update Strategy"
                  : isDuplicating
                    ? "Create Strategy"
                    : "Create Strategy"}
              </Button>
              {formValidationError && (
                <p className="text-xs text-muted-foreground">
                  {formValidationError}
                </p>
              )}
              {isEditing &&
                !formValidationError &&
                !isLoadingStrategy &&
                !hasChanges && (
                  <p className="text-xs text-muted-foreground">
                    No changes to update yet.
                  </p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
