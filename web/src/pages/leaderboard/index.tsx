import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  Bookmark,
  BookmarkCheck,
  ArrowLeftRight,
  CalendarClock,
  CandlestickChart,
  ChevronDown,
  CircleDollarSign,
  Copy,
  Compass,
  ListFilter,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  SquareArrowOutUpRight,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { getApiErrorMessage } from "@/api/axios"
import { deleteBacktest, fetchBacktestLeaderboard } from "@/api/backtest"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import { useBookmarkIds } from "@/hooks/use-bookmark-ids"

type BacktestSortBy =
  | "createdAt"
  | "winRate"
  | "roi"
  | "maxDrawdownPercent"
  | "profitFactor"

type BacktestDurationFilter = "all" | "7d" | "1m" | "3m" | "6m" | "1y"

const durationFilterOptions: Array<{
  value: BacktestDurationFilter
  label: string
}> = [
  { value: "all", label: "All" },
  { value: "7d", label: "7D" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
]

type LeaderboardBacktest = {
  _id: string
  exchange: string
  symbol: string
  timeframe: string
  startDate: string
  endDate: string
  entryFeeRate?: number
  exitFeeRate?: number
  hedgeMode?: boolean
  createdAt?: string
  updatedAt?: string
  strategy?: {
    _id?: string
    name?: string
    isPublic?: boolean
  }
  user?: {
    _id?: string
    name?: string
    username?: string
    avatar?: string
  }
  result: {
    duration: number
    initialBalance: number
    finalBalance: number
    totalPnL: number
    roi: number
    totalTrades: number
    winRate: number
    profitFactor: number
    maxDrawdownPercent: number
    totalFees: number
  }
}

type LeaderboardResponse = {
  status: boolean
  message: string
  result: {
    total?: number
    hasNextPage?: boolean
    backtests?: LeaderboardBacktest[]
  }
}

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})

function mergeBacktestPages(
  prev: LeaderboardBacktest[],
  nextItems: LeaderboardBacktest[]
) {
  return Array.from(
    new Map([...prev, ...nextItems].map((item) => [item._id, item])).values()
  )
}

function formatDateLabel(value?: string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
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
    const hours = totalHours
    const minutes = totalMinutes % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return `${Math.max(1, totalMinutes)}m`
}

export default function LeaderboardPage() {
  const user = useAuthStore((state) => state.user)
  const [backtests, setBacktests] = useState<LeaderboardBacktest[]>([])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [source, setSource] = useState<"all" | "me">("all")
  const [duration, setDuration] = useState<BacktestDurationFilter>("all")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAppending, setIsAppending] = useState(false)
  const [sortBy, setSortBy] = useState<BacktestSortBy>("roi")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [backtestIdPendingDelete, setBacktestIdPendingDelete] = useState("")
  const [isDeletingBacktest, setIsDeletingBacktest] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)
  const {
    bookmarkedIds: bookmarkedBacktestIds,
    updatingIds: updatingBacktestIds,
    loadBookmarks: loadBacktestBookmarks,
    toggleBookmark: toggleBacktestBookmark,
  } = useBookmarkIds("backtest")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const loadLeaderboard = async () => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsAppending(true)
      }

      try {
        const response = (await fetchBacktestLeaderboard({
          page,
          search: debouncedSearch,
          source,
          duration,
          sortBy,
          order,
        })) as LeaderboardResponse

        const result = response?.result
        const pageItems = result?.backtests ?? []

        if (requestIdRef.current !== requestId) {
          return
        }

        setBacktests((prev) => {
          if (page === 1) {
            return pageItems
          }

          return mergeBacktestPages(prev, pageItems)
        })

        setTotalCount(result?.total ?? 0)
        setHasNextPage(Boolean(result?.hasNextPage))
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return
        }

        toast.error(getApiErrorMessage(error, "Failed to load leaderboard"))
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false)
          setIsAppending(false)
        }
      }
    }

    void loadLeaderboard()
  }, [page, debouncedSearch, source, duration, sortBy, order])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !hasNextPage || isLoading || isAppending) return

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (firstEntry?.isIntersecting && !isAppending && !isLoading) {
          setPage((prev) => prev + 1)
        }
      },
      {
        root: null,
        rootMargin: "220px 0px",
        threshold: 0,
      }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isAppending, isLoading])

  useEffect(() => {
    void loadBacktestBookmarks().catch((error) => {
      toast.error(getApiErrorMessage(error, "Failed to load bookmarks"))
    })
  }, [loadBacktestBookmarks])

  const onCopyResultLink = async (backtestId: string) => {
    const resultUrl = `${window.location.origin}/backtest/${backtestId}`

    try {
      await navigator.clipboard.writeText(resultUrl)
      toast.success("Link copied")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const onToggleBacktestBookmark = async (backtestId: string) => {
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

  const onDeleteBacktest = async () => {
    if (!backtestIdPendingDelete) {
      return
    }

    setIsDeletingBacktest(true)

    try {
      const promise = deleteBacktest(backtestIdPendingDelete)

      toast.promise(promise, {
        loading: "Deleting backtest...",
        success: (response) =>
          response?.message || "Backtest deleted successfully",
        error: (error) =>
          getApiErrorMessage(error, "Failed to delete backtest"),
      })

      await promise

      setBacktests((prev) =>
        prev.filter((item) => item._id !== backtestIdPendingDelete)
      )
      setTotalCount((prev) => Math.max(0, prev - 1))
      setBacktestIdPendingDelete("")
    } finally {
      setIsDeletingBacktest(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Performance Arena
          </p>

          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-4xl">
            <Trophy className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
            Backtest Leaderboard
          </h1>

          <p className="max-w-3xl text-muted-foreground">
            Review recent simulations across symbols, strategies, and traders,
            then open any result page to inspect the full equity curve and trade
            history.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Ranked by performance
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              <CandlestickChart className="h-3.5 w-3.5 text-primary" />
              Result-first browsing
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/70">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Leaderboard Results</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                Search by symbol, strategy, trader, or timeframe.
                <span className="hidden items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground sm:inline-flex">
                  {totalCount} results
                </span>
              </CardDescription>
              <div className="pt-1 sm:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {totalCount} results
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search"
              className="pr-10 pl-9 sm:pr-[19rem]"
            />
            <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
              <div className="hidden items-center gap-1 sm:flex">
                {durationFilterOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={duration === option.value ? "secondary" : "ghost"}
                    className="h-7 min-w-10 justify-center px-2 text-center text-[11px] uppercase"
                    onClick={() => {
                      setDuration(option.value)
                      setPage(1)
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7"
                  >
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={(value) => {
                      const nextSortBy = value as BacktestSortBy
                      setSortBy(nextSortBy)
                      setOrder(
                        nextSortBy === "roi" ||
                          nextSortBy === "winRate" ||
                          nextSortBy === "profitFactor" ||
                          nextSortBy === "createdAt"
                          ? "desc"
                          : "asc"
                      )
                      setPage(1)
                    }}
                  >
                    <DropdownMenuRadioItem value="roi">
                      ROI
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="winRate">
                      Win Rate
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="profitFactor">
                      Profit Factor
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="maxDrawdownPercent">
                      Max Drawdown
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="createdAt">
                      Newest
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Order</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={order}
                    onValueChange={(value) => {
                      setOrder(value as "asc" | "desc")
                      setPage(1)
                    }}
                  >
                    <DropdownMenuRadioItem value="desc">
                      Desc
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="asc">
                      Asc
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex gap-1 sm:hidden">
            {durationFilterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={duration === option.value ? "secondary" : "outline"}
                className="h-8 min-w-0 flex-1 justify-center px-1 text-center text-[10px] uppercase"
                onClick={() => {
                  setDuration(option.value)
                  setPage(1)
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={source === "all" ? "default" : "outline"}
              className="gap-2"
              onClick={() => {
                setSource("all")
                setPage(1)
              }}
            >
              <Compass className="h-4 w-4" />
              Explore
            </Button>
            <Button
              type="button"
              variant={source === "me" ? "default" : "outline"}
              className="gap-2"
              onClick={() => {
                setSource("me")
                setPage(1)
              }}
            >
              <UserRound className="h-4 w-4" />
              Me
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading leaderboard...
            </span>
          </CardContent>
        </Card>
      ) : backtests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
            No leaderboard results found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {backtests.map((backtest, index) => {
            const isMine =
              Boolean(user?._id) && backtest.user?._id === user?._id

            return (
              <Card
                key={backtest._id}
                className={cn(
                  "overflow-hidden transition-colors hover:border-primary/30",
                  index === 0 && "border-primary/30"
                )}
              >
                <CardHeader className="space-y-3 border-b border-border/60 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        {backtest.symbol}
                      </CardTitle>
                      <CardDescription className="flex min-w-0 flex-wrap items-center gap-2">
                        <span>{backtest.timeframe}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="inline-flex min-w-0 items-center">
                          <span className="max-w-[180px] truncate">
                            {backtest.strategy?.name || "Strategy"}
                          </span>
                        </span>
                      </CardDescription>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="px-3 py-2 text-right">
                        <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                          ROI
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-base font-semibold",
                            backtest.result.roi >= 0
                              ? "text-success"
                              : "text-destructive"
                          )}
                        >
                          {backtest.result.roi >= 0 ? "+" : ""}
                          {ratio.format(backtest.result.roi)}%
                        </p>
                      </div>

                      <ButtonGroup className="shrink-0">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant={
                            bookmarkedBacktestIds.has(backtest._id)
                              ? "outline"
                              : "ghost"
                          }
                          className="rounded-r-none border border-border text-muted-foreground"
                          aria-label={
                            bookmarkedBacktestIds.has(backtest._id)
                              ? "Bookmarked"
                              : "Bookmark"
                          }
                          title={
                            bookmarkedBacktestIds.has(backtest._id)
                              ? "Bookmarked"
                              : "Bookmark"
                          }
                          disabled={updatingBacktestIds.has(backtest._id)}
                          onClick={() => {
                            void onToggleBacktestBookmark(backtest._id)
                          }}
                        >
                          {updatingBacktestIds.has(backtest._id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : bookmarkedBacktestIds.has(backtest._id) ? (
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant={
                                bookmarkedBacktestIds.has(backtest._id)
                                  ? "outline"
                                  : "ghost"
                              }
                              className="-ml-px rounded-l-none border border-border text-muted-foreground"
                              aria-label="More actions"
                              title="More actions"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 min-w-44"
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/backtest/${backtest._id}`}
                                className="flex items-center gap-2"
                              >
                                <SquareArrowOutUpRight className="h-4 w-4" />
                                Open
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                void onCopyResultLink(backtest._id)
                              }}
                            >
                              <Copy className="h-4 w-4" />
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                void onToggleBacktestBookmark(backtest._id)
                              }}
                              disabled={updatingBacktestIds.has(backtest._id)}
                            >
                              {bookmarkedBacktestIds.has(backtest._id) ? (
                                <BookmarkCheck className="h-4 w-4" />
                              ) : (
                                <Bookmark className="h-4 w-4" />
                              )}
                              {bookmarkedBacktestIds.has(backtest._id)
                                ? "Bookmarked"
                                : "Bookmark"}
                            </DropdownMenuItem>
                            {isMine ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/backtest/${backtest._id}/edit`}
                                    className="flex items-center gap-2"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => {
                                    setBacktestIdPendingDelete(backtest._id)
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
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5 text-primary" />@
                      {backtest.user?.username || "unknown"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Duration
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDuration(backtest.result.duration)}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Win Rate
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {ratio.format(backtest.result.winRate)}%
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Profit Factor
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {ratio.format(backtest.result.profitFactor)}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Drawdown
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        -
                        {ratio.format(
                          Math.abs(backtest.result.maxDrawdownPercent)
                        )}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4 text-primary" />
                      <span>
                        Total trades {backtest.result.totalTrades} (
                        {backtest.hedgeMode ? "Hedge mode" : "One-way"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-primary" />
                      <span>
                        Entry / Exit Fees:{" "}
                        {ratio.format(backtest.entryFeeRate ?? 0)}% /{" "}
                        {ratio.format(backtest.exitFeeRate ?? 0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="min-w-0 truncate">
                        {backtest.strategy?.name || "Strategy"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      <span>
                        Date Range {formatDateLabel(backtest.startDate)} to{" "}
                        {formatDateLabel(backtest.endDate)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <Link
                      to={`/backtest/${backtest._id}`}
                      className="inline-flex items-center justify-center gap-1.5"
                    >
                      <SquareArrowOutUpRight className="h-4 w-4" />
                      Open
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div ref={loadMoreRef} className="flex h-10 items-center justify-center">
        {isAppending ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more results...
          </span>
        ) : null}
      </div>

      <AlertDialog
        open={Boolean(backtestIdPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingBacktest) {
            setBacktestIdPendingDelete("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backtest permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The saved backtest result will be
              removed from your list immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBacktest}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={isDeletingBacktest}
              onClick={(event) => {
                event.preventDefault()
                void onDeleteBacktest()
              }}
            >
              {isDeletingBacktest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
