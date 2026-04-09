import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
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
  Globe,
  Lock,
  Loader2,
  Pencil,
  Percent,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  SquareArrowOutUpRight,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react"
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  XAxis,
} from "recharts"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { deleteBacktest, fetchBacktestById } from "@/api/backtest"
import { useAuthStore } from "@/store/auth"
import { useBookmarkStore } from "@/store/bookmark"
import { toast } from "sonner"

type EquityPoint = {
  timestamp: number
  equity: number
}

type Trade = {
  side: "buy" | "sell" | string
  entryTime: number
  exitTime: number
  entryPrice: number
  exitPrice: number
  pnl: number
  pnlPercent: number
  exitReason: "stopLoss" | "takeProfit" | string
}

type BacktestResult = {
  duration: number
  initialBalance: number
  finalBalance: number
  totalPnL: number
  roi: number
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  profitFactor: number
  payoffRatio?: number
  grossProfit: number
  grossLoss: number
  averageWin: number
  averageLoss: number
  expectancy?: number
  averageTradeDuration?: number
  longestTradeDuration?: number
  shortestTradeDuration?: number
  maxWin: number
  maxLoss: number
  maxWinStreak: number
  maxLossStreak: number
  streakInsight?: string
  maxDrawdown: number
  maxDrawdownPercent: number
  recoveryFactor?: number
  totalFees: number
  averageTradeFee: number
  averageTradePnL: number
  equityCurves: EquityPoint[]
  trades: Trade[]
}

type BacktestDetail = {
  _id: string
  symbol: string
  timeframe: string
  startDate: string
  endDate: string
  hedgeMode: boolean
  amountPerTrade: number
  entryFeeRate: number
  exitFeeRate: number
  strategy?: {
    _id?: string
    name?: string
    description?: string
    isPublic?: boolean
    stats?: {
      viewCount?: number
      bookmarkCount?: number
    }
    user?: {
      _id?: string
      name?: string
      username?: string
      avatar?: string
    }
  }
  user?: {
    _id?: string
    name?: string
    username?: string
  }
  result: BacktestResult
}

let backtestBookmarkLoadPromise: Promise<void> | null = null

async function loadBacktestBookmarksOnce(
  loadBacktestBookmarks: () => Promise<void>
) {
  if (backtestBookmarkLoadPromise) return backtestBookmarkLoadPromise

  backtestBookmarkLoadPromise = loadBacktestBookmarks().finally(() => {
    backtestBookmarkLoadPromise = null
  })

  return backtestBookmarkLoadPromise
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const moneyFixed = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
}

function formatDuration(durationMs?: number) {
  if (!Number.isFinite(durationMs) || !durationMs || durationMs <= 0) {
    return "-"
  }

  const totalMinutes = Math.floor(durationMs / 60000)
  const totalHours = Math.floor(durationMs / 3600000)
  const totalDays = Math.floor(durationMs / 86400000)

  if (totalDays >= 1) {
    return `${totalDays}d`
  }

  if (totalHours >= 1) {
    const minutes = totalMinutes % 60
    return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`
  }

  return `${Math.max(1, totalMinutes)}m`
}

function EquityCurve({
  data,
  initialBalance,
  finalBalance,
}: {
  data: EquityPoint[]
  initialBalance: number
  finalBalance: number
}) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        timestamp: item.timestamp,
        equity: Number(item.equity.toFixed(2)),
      })),
    [data]
  )

  if (chartData.length < 2) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-border/70 bg-background text-sm text-muted-foreground">
        No equity curve data available.
      </div>
    )
  }

  const startEquity = initialBalance
  const endEquity = finalBalance
  const returnPercent =
    startEquity > 0 ? ((endEquity - startEquity) / startEquity) * 100 : 0
  const isProfit = endEquity >= startEquity
  const returnPrefix = returnPercent >= 0 ? "+" : ""

  const chartConfig = {
    equity: {
      label: "Equity",
      color: isProfit ? "var(--color-success)" : "var(--color-destructive)",
    },
  } satisfies ChartConfig

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm",
        isProfit
          ? "shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-success)_12%,transparent)]"
          : "shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-destructive)_12%,transparent)]"
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Equity Trend
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-md border px-2 py-1 text-xs font-medium",
            isProfit
              ? "border-success/25 bg-success/10 text-success"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          )}
        >
          ROI {returnPrefix}
          {ratio.format(returnPercent)}%
        </span>
      </div>

      <div className="px-2 py-3 sm:px-3 sm:py-4">
        <ChartContainer config={chartConfig} className="h-64 sm:h-80">
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
    </div>
  )
}

export default function BacktestResultPage() {
  const navigate = useNavigate()
  const { backtestId = "" } = useParams()
  const user = useAuthStore((state) => state.user)
  const bookmarkedBacktestIds = useBookmarkStore(
    (state) => state.bookmarkedBacktestIds
  )
  const bookmarkedStrategyIds = useBookmarkStore(
    (state) => state.bookmarkedStrategyIds
  )
  const updatingBacktestIds = useBookmarkStore(
    (state) => state.updatingBacktestIds
  )
  const updatingStrategyIds = useBookmarkStore(
    (state) => state.updatingStrategyIds
  )
  const loadStrategyBookmarks = useBookmarkStore(
    (state) => state.loadStrategyBookmarks
  )
  const loadBacktestBookmarks = useBookmarkStore(
    (state) => state.loadBacktestBookmarks
  )
  const toggleStrategyBookmark = useBookmarkStore(
    (state) => state.toggleStrategyBookmark
  )
  const toggleBacktestBookmark = useBookmarkStore(
    (state) => state.toggleBacktestBookmark
  )
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [tradesPage, setTradesPage] = useState(1)
  const [backtest, setBacktest] = useState<BacktestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadBacktest = async () => {
      if (!backtestId) {
        if (isMounted) setBacktest(null)
        if (isMounted) setIsLoading(false)
        return
      }

      setIsLoading(true)
      setBacktest(null)

      try {
        const [response] = await Promise.all([
          fetchBacktestById(backtestId),
          isAuthenticated
            ? Promise.all([
                loadBacktestBookmarksOnce(loadBacktestBookmarks),
                loadStrategyBookmarks(),
              ])
            : Promise.resolve(),
        ])

        if (!isMounted) return
        setBacktest(response?.result?.backtest ?? null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadBacktest()

    return () => {
      isMounted = false
    }
  }, [backtestId, isAuthenticated, loadBacktestBookmarks, loadStrategyBookmarks])

  if (!backtestId) {
    return <Navigate to="/backtest" replace />
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
    )
  }

  if (!backtest?.result) {
    return <Navigate to="/backtest" replace />
  }

  const result = backtest.result
  const pnlPositive = result.totalPnL >= 0
  const averageTradeFee = Number.isFinite(result.averageTradeFee)
    ? result.averageTradeFee
    : 0
  const strategyName = backtest.strategy?.name?.trim() || "Strategy"
  const strategyIsPublic = backtest.strategy?.isPublic ?? false
  const strategyCreatorUsername =
    backtest.strategy?.user?.username?.trim().replace(/^@/, "") || "unknown"
  const isBacktestOwner = Boolean(user?._id) && backtest.user?._id === user?._id
  const isBacktestBookmarked = bookmarkedBacktestIds.has(backtestId)
  const isBacktestBookmarkUpdating = updatingBacktestIds.has(backtestId)
  const isStrategyOwner =
    Boolean(user?._id) && backtest.strategy?.user?._id === user?._id
  const isStrategyBookmarked = Boolean(
    backtest.strategy?._id &&
      bookmarkedStrategyIds.has(backtest.strategy._id)
  )
  const isStrategyBookmarkUpdating = Boolean(
    backtest.strategy?._id &&
      updatingStrategyIds.has(backtest.strategy._id)
  )
  const canOpenCreatorProfile =
    !isStrategyOwner && strategyCreatorUsername !== "unknown"
  const canOpenStrategy =
    Boolean(backtest.strategy?._id) && (strategyIsPublic || isStrategyOwner)
  const tradesPerPage = 10
  const totalTradesPages = Math.max(
    1,
    Math.ceil(result.trades.length / tradesPerPage)
  )
  const recentTrades = result.trades.slice(
    (tradesPage - 1) * tradesPerPage,
    tradesPage * tradesPerPage
  )
  const tradePageItems = (() => {
    if (totalTradesPages <= 7) {
      return Array.from({ length: totalTradesPages }, (_, index) => index + 1)
    }

    const items: Array<number | "left-ellipsis" | "right-ellipsis"> = [1]
    const start = Math.max(2, tradesPage - 1)
    const end = Math.min(totalTradesPages - 1, tradesPage + 1)

    if (start > 2) items.push("left-ellipsis")
    for (let page = start; page <= end; page += 1) items.push(page)
    if (end < totalTradesPages - 1) items.push("right-ellipsis")
    items.push(totalTradesPages)
    return items
  })()

  const onDeleteBacktest = async () => {
    setIsDeleting(true)

    try {
      const promise = deleteBacktest(backtestId)

      // Keep the result page responsive while the delete completes.
      await promise
      navigate("/leaderboard", { replace: true })
    } finally {
      setIsDeleting(false)
      setIsDeleteConfirmOpen(false)
    }
  }

  const onCopyResultLink = async () => {
    const resultUrl = `${window.location.origin}/backtest/${backtestId}`

    try {
      await navigator.clipboard.writeText(resultUrl)
      toast.success("Link copied")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const onToggleBacktestBookmark = async () => {
    const result = await toggleBacktestBookmark(backtestId)
    if (!result) {
      return
    }

    if (result.status === "success") {
      toast.success(result.message)
      return
    }

    toast.error(result.message)
  }

  const onToggleStrategyBookmark = async () => {
    if (!backtest.strategy?._id) {
      return
    }

    const result = await toggleStrategyBookmark(backtest.strategy._id)
    if (!result) {
      return
    }

    if (result.status === "success") {
      toast.success(result.message)
      return
    }

    toast.error(result.message)
  }

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <section className="theme-hero-panel relative overflow-hidden rounded-xl border p-4 sm:p-6">
        <div className="theme-hero-overlay absolute inset-0" />

        <div className="relative flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="theme-glass-button w-fit"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1)
                  return
                }

                navigate("/backtest")
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
                variant={isBacktestBookmarked ? "outline" : "default"}
                size="icon-sm"
                className="theme-glass-button rounded-r-none"
                aria-label={isBacktestBookmarked ? "Bookmarked" : "Bookmark"}
                title={isBacktestBookmarked ? "Bookmarked" : "Bookmark"}
                disabled={isBacktestBookmarkUpdating}
                onClick={() => {
                  void onToggleBacktestBookmark()
                }}
              >
                {isBacktestBookmarkUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isBacktestBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant={isBacktestBookmarked ? "outline" : "default"}
                    size="icon-sm"
                    className="theme-glass-button -ml-px rounded-l-none"
                    aria-label="More actions"
                    title="More actions"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 min-w-44">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => {
                      void onCopyResultLink()
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void onToggleBacktestBookmark()
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
                          setIsDeleteConfirmOpen(true)
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

          <div>
            <p className="inline-flex w-fit items-center gap-1.5 rounded-md border bg-background/80 px-2.5 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Backtest Result
            </p>

            <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-4xl">
              <CandlestickChart className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
              {backtest.symbol} Backtest Result
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
              Review the full result on its own page with performance metrics,
              equity movement, and detailed trade history.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {backtest.timeframe}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 text-primary" />
                {formatDuration(result.duration)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 text-primary" />@
                {backtest.user?.username || "unknown"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[170px] truncate">
                  {backtest.strategy?.name || "Strategy"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteConfirmOpen(open)
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
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void onDeleteBacktest()
              }}
            >
              {isDeleting ? <>Deleting...</> : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              ROI
            </CardDescription>
            <CardTitle
              className={cn(
                "text-xl sm:text-2xl",
                result.roi >= 0 ? "text-success" : "text-destructive"
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
              <p>
                {pnlPositive ? (
                  <TrendingUp className="mr-1 inline h-4 w-4" />
                ) : (
                  <TrendingDown className="mr-1 inline h-4 w-4" />
                )}
                {money.format(result.totalPnL)} total PnL
              </p>
              <p className="text-muted-foreground">
                Final balance: {money.format(result.finalBalance)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Win Rate
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {ratio.format(result.winRate)}%
            </CardTitle>
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

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Max Drawdown
            </CardDescription>
            <CardTitle className="text-xl text-destructive sm:text-2xl">
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

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Profit Factor
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {ratio.format(result.profitFactor)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-1.5">
              <p>Avg trade: {money.format(result.averageTradePnL)}</p>
              <p>Payoff: {ratio.format(result.payoffRatio ?? 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4" />
              Fees
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {money.format(result.totalFees)}
            </CardTitle>
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

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Win / Loss Streak
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              <span className="text-success">{result.maxWinStreak ?? 0}</span>
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

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Date Window
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {formatDuration(result.duration)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-1.5">
              <p>
                {format(new Date(backtest.startDate), "PPP")} to{" "}
                {format(new Date(backtest.endDate), "PPP")}
              </p>
              <p>
                Market: {backtest.symbol} · {backtest.timeframe}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Position Duration
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
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
              <p>Expectancy: {money.format(result.expectancy ?? 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/95 dark:bg-background/80">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Trade Setup
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {backtest.hedgeMode ? "Hedge" : "One-way"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-1.5">
              <p>Initial balance: {money.format(result.initialBalance)}</p>
              <p>{money.format(backtest.amountPerTrade)} per trade</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-background/95 dark:bg-background/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <AreaChart className="h-5 w-5 text-primary" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Breakdown and edge quality metrics from this backtest.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Gross Profit / Loss
            </p>
            <div className="mt-2 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Profit</p>
                <p className="font-semibold text-success">
                  {money.format(result.grossProfit)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Loss</p>
                <p className="font-semibold text-destructive">
                  {money.format(result.grossLoss)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Net P/L</p>
                <p
                  className={cn(
                    "font-semibold",
                    result.totalPnL >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {money.format(result.totalPnL)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Average Win / Loss
            </p>
            <div className="mt-2 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Avg Win</p>
                <p className="font-semibold text-success">
                  {money.format(result.averageWin)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Avg Loss</p>
                <p className="font-semibold text-destructive">
                  {money.format(result.averageLoss)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Avg Fee</p>
                <p className="font-semibold">
                  {moneyFixed.format(averageTradeFee)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Edge
            </p>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Expectancy</p>
                <p
                  className={cn(
                    "font-semibold",
                    (result.expectancy ?? 0) >= 0
                      ? "text-success"
                      : "text-destructive"
                  )}
                >
                  {money.format(result.expectancy ?? 0)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Payoff</p>
                <p className="font-semibold">
                  {ratio.format(result.payoffRatio ?? 0)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Win Rate</p>
                <p className="font-semibold">{ratio.format(result.winRate)}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Risk Recovery
            </p>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Recovery</p>
                <p
                  className={cn(
                    "font-semibold",
                    (result.recoveryFactor ?? 0) >= 0
                      ? "text-success"
                      : "text-destructive"
                  )}
                >
                  {ratio.format(result.recoveryFactor ?? 0)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Best / Worst Trade</p>
                <p className="font-semibold">
                  <span className="text-success">
                    {money.format(result.maxWin)}
                  </span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-destructive">
                    {money.format(result.maxLoss)}
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground">Max DD %</p>
                <p className="font-semibold text-destructive">
                  -{ratio.format(Math.abs(result.maxDrawdownPercent))}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/95 dark:bg-background/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="h-5 w-5 text-primary" />
            Strategy
          </CardTitle>
          <CardDescription>
            The strategy is the core of this backtest result.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 space-y-2">
              <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                {strategyName}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />@
                  {strategyCreatorUsername}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                  {strategyIsPublic ? (
                    <Globe className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  {isStrategyOwner
                    ? "Mine"
                    : strategyIsPublic
                      ? "Public"
                      : "Private"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{backtest.strategy?.stats?.viewCount ?? "-"}</span>
                  <span className="hidden sm:inline">views</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>{backtest.strategy?.stats?.bookmarkCount ?? "-"}</span>
                  <span className="hidden sm:inline">bookmarks</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {canOpenStrategy && backtest.strategy?._id ? (
              <ButtonGroup className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] sm:inline-flex sm:w-auto">
                <Button
                  type="button"
                  className="min-w-0 w-full rounded-r-none sm:w-auto sm:flex-none"
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
                  <DropdownMenuContent align="end" className="w-44 min-w-44">
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
                        void onToggleStrategyBookmark()
                      }}
                      disabled={
                        !backtest.strategy?._id || isStrategyBookmarkUpdating
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
                className="w-full sm:w-auto sm:flex-none"
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
              <span className="inline-flex w-full items-center justify-center gap-1 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground sm:w-auto sm:flex-none">
                <Lock className="h-4 w-4" />
                Locked
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-full min-w-0 border-border/70 bg-background/95 dark:bg-background/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <AreaChart className="h-5 w-5 text-primary" />
            Equity Curve
          </CardTitle>
          <CardDescription>
            From {money.format(result.initialBalance)} to{" "}
            {money.format(result.finalBalance)} with {result.totalTrades} closed
            trades.
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

      <Card className="border-border/70 bg-background/95 dark:bg-background/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CandlestickChart className="h-5 w-5 text-primary" />
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
                      event.preventDefault()
                      setTradesPage((prev) => Math.max(1, prev - 1))
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
                          event.preventDefault()
                          setTradesPage(item)
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={`${item}-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      setTradesPage((prev) =>
                        Math.min(totalTradesPages, prev + 1)
                      )
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
    </div>
  )
}
