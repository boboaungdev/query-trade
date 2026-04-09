import { useEffect, useRef, useState } from "react"
import {
  CalendarClock,
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  ChevronDown,
  Copy,
  Globe,
  Layers3,
  Loader2,
  Lock,
  ListFilter,
  Percent,
  Search,
  Sparkles,
  SquareArrowOutUpRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { getApiErrorMessage } from "@/api/axios"
import {
  deleteBookmark,
  fetchBookmarks,
  type BookmarkTargetType,
} from "@/api/bookmark"
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
import { useAuthStore } from "@/store/auth"
import { useBookmarkStore } from "@/store/bookmark"

type BookmarkFilter = "all" | BookmarkTargetType

type BookmarkTarget = {
  _id?: string
  name?: string
  description?: string
  isPublic?: boolean
  user?: string | { _id?: string; username?: string }
  symbol?: string
  timeframe?: string
  startDate?: string
  endDate?: string
  result?: {
    roi?: number
    winRate?: number
    duration?: number
  }
  stats?: {
    viewCount?: number
    bookmarkCount?: number
  }
}

type BookmarkItem = {
  _id: string
  targetType: BookmarkTargetType
  target?: BookmarkTarget
  createdAt?: string
  updatedAt?: string
}

type BookmarkListResponse = {
  status: boolean
  message: string
  result?: {
    total?: number
    hasNextPage?: boolean
    bookmarks?: BookmarkItem[]
  }
}

function toPrettyDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
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

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})

function mergeBookmarks(prev: BookmarkItem[], next: BookmarkItem[]) {
  return Array.from(
    new Map([...prev, ...next].map((item) => [item._id, item])).values()
  )
}

function hasBookmarkTarget(item: BookmarkItem) {
  return Boolean(item.target?._id)
}

export default function BookmarkPage() {
  const user = useAuthStore((state) => state.user)
  const setBookmarkedStrategyId = useBookmarkStore(
    (state) => state.setBookmarkedStrategyId
  )
  const setBookmarkedBacktestId = useBookmarkStore(
    (state) => state.setBookmarkedBacktestId
  )

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [filter, setFilter] = useState<BookmarkFilter>("all")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAppending, setIsAppending] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [removingBookmarkIds, setRemovingBookmarkIds] = useState<Set<string>>(
    new Set()
  )
  const [bookmarkPendingRemove, setBookmarkPendingRemove] =
    useState<BookmarkItem | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const loadBookmarks = async () => {
        if (page === 1) {
          setIsLoading(true)
        } else {
          setIsAppending(true)
        }

        try {
          const response = (await fetchBookmarks({
            page,
            targetType: filter === "all" ? undefined : filter,
            search: search.trim(),
            sortBy,
            order,
          })) as BookmarkListResponse

          const nextItems = (response?.result?.bookmarks ?? []).filter(
            hasBookmarkTarget
          )

          setBookmarks((prev) => {
            if (page === 1) {
              return nextItems
            }
            return mergeBookmarks(prev, nextItems)
          })

          setTotalCount(response?.result?.total ?? 0)
          setHasNextPage(Boolean(response?.result?.hasNextPage))
        } catch (error) {
          toast.error(getApiErrorMessage(error, "Failed to load bookmarks"))
        } finally {
          setIsLoading(false)
          setIsAppending(false)
        }
      }

      void loadBookmarks()
    }, 180)

    return () => clearTimeout(timer)
  }, [filter, order, page, search, sortBy])

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

  const onCopyBookmarkLink = async (bookmark: BookmarkItem) => {
    const targetId = bookmark.target?._id
    const targetPath =
      bookmark.targetType === "backtest"
        ? `/backtest/${targetId}`
        : bookmark.targetType === "strategy"
          ? `/strategy/${targetId}`
          : ""

    if (!targetId || !targetPath) {
      toast.error("Missing target link")
      return
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${targetPath}`
      )
      toast.success("Link copied")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy link"))
    }
  }

  const onRemoveBookmark = async (bookmark: BookmarkItem) => {
    const targetId = bookmark.target?._id
    if (!targetId) {
      toast.error("Missing target id")
      return
    }

    setRemovingBookmarkIds((prev) => {
      const next = new Set(prev)
      next.add(bookmark._id)
      return next
    })

    try {
      await deleteBookmark({
        targetType: bookmark.targetType,
        targetId,
      })

      if (bookmark.targetType === "strategy") {
        setBookmarkedStrategyId(targetId, false)
      }
      if (bookmark.targetType === "backtest") {
        setBookmarkedBacktestId(targetId, false)
      }

      setBookmarks((prev) => prev.filter((item) => item._id !== bookmark._id))
      setTotalCount((prev) => Math.max(0, prev - 1))

      toast.success("Bookmark removed")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove bookmark"))
    } finally {
      setRemovingBookmarkIds((prev) => {
        const next = new Set(prev)
        next.delete(bookmark._id)
        return next
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Bookmark Hub
          </p>

          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-4xl">
            <Bookmark className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
            Bookmarks
          </h1>

          <p className="max-w-3xl text-muted-foreground">
            Keep everything you bookmark in one place so you can find it quickly
            and remove what you no longer need.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              Strategies
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              <CandlestickChart className="h-3.5 w-3.5 text-primary" />
              Backtests
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border/70">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Bookmarks</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                Browse, filter, and manage your bookmarks.
                <span className="hidden items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground sm:inline-flex">
                  {totalCount} bookmarks
                </span>
              </CardDescription>
              <div className="pt-1 sm:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {totalCount} bookmarks
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
              placeholder="Search bookmarks"
              className="pr-10 pl-9 sm:pr-[15rem]"
            />
            <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
              <div className="hidden items-center gap-1 sm:flex">
                <Button
                  type="button"
                  variant={filter === "all" ? "secondary" : "ghost"}
                  className="h-7 min-w-10 justify-center px-2 text-center text-[11px] tracking-[0.14em] uppercase"
                  onClick={() => {
                    setFilter("all")
                    setPage(1)
                  }}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant={filter === "backtest" ? "secondary" : "ghost"}
                  className="h-7 min-w-10 justify-center px-2 text-center text-[11px] tracking-[0.14em] uppercase"
                  onClick={() => {
                    setFilter("backtest")
                    setPage(1)
                  }}
                >
                  Backtests
                </Button>
                <Button
                  type="button"
                  variant={filter === "strategy" ? "secondary" : "ghost"}
                  className="h-7 min-w-10 justify-center px-2 text-center text-[11px] tracking-[0.14em] uppercase"
                  onClick={() => {
                    setFilter("strategy")
                    setPage(1)
                  }}
                >
                  Strategies
                </Button>
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
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value as "createdAt" | "updatedAt")
                      setPage(1)
                    }}
                  >
                    <DropdownMenuRadioItem value="updatedAt">
                      Last updated
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="createdAt">
                      Bookmarked date
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
                      Descending
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="asc">
                      Ascending
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex gap-1 sm:hidden">
            <Button
              type="button"
              variant={filter === "all" ? "secondary" : "outline"}
              className="h-8 min-w-0 flex-1 justify-center px-1 text-center text-[10px] tracking-[0.12em] uppercase"
              onClick={() => {
                setFilter("all")
                setPage(1)
              }}
            >
              All
            </Button>
            <Button
              type="button"
              variant={filter === "backtest" ? "secondary" : "outline"}
              className="h-8 min-w-0 flex-1 justify-center px-1 text-center text-[10px] tracking-[0.12em] uppercase"
              onClick={() => {
                setFilter("backtest")
                setPage(1)
              }}
            >
              Backtests
            </Button>
            <Button
              type="button"
              variant={filter === "strategy" ? "secondary" : "outline"}
              className="h-8 min-w-0 flex-1 justify-center px-1 text-center text-[10px] tracking-[0.12em] uppercase"
              onClick={() => {
                setFilter("strategy")
                setPage(1)
              }}
            >
              Strategies
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Loading bookmarks...
            </div>
          ) : totalCount === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              {search.trim()
                ? "No bookmarks matched your search."
                : "No bookmarks yet. Save strategies or backtests to build your collection."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {bookmarks.map((item) => {
                const target = item.target
                const targetId = target?._id
                const isStrategy = item.targetType === "strategy"
                const isBacktest = item.targetType === "backtest"
                const targetUserId =
                  typeof target?.user === "string"
                    ? target.user
                    : target?.user?._id
                const targetUsername =
                  typeof target?.user === "object"
                    ? target.user?.username?.trim().replace(/^@/, "")
                    : ""
                const isMine = Boolean(user?._id) && targetUserId === user?._id
                const title = isBacktest
                  ? `${target?.symbol || "Backtest"}${target?.timeframe ? ` • ${target.timeframe}` : ""}`
                  : target?.name || "Untitled target"
                const description = isBacktest
                  ? `Backtest period: ${toPrettyDate(target?.startDate)} - ${toPrettyDate(target?.endDate)}`
                  : target?.description?.trim() || "No description"

                return (
                  <article
                    key={item._id}
                    className="min-w-0 rounded-xl border p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 font-semibold">{title}</h3>
                        <p className="text-xs text-muted-foreground">
                          Bookmarked on {toPrettyDate(item.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                            isStrategy
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : isBacktest
                                ? "border-info/30 bg-info/10 text-info"
                                : "border-border bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {isStrategy ? (
                            <Layers3 className="h-3.5 w-3.5" />
                          ) : isBacktest ? (
                            <CandlestickChart className="h-3.5 w-3.5" />
                          ) : (
                            <Bookmark className="h-3.5 w-3.5" />
                          )}
                          {isStrategy
                            ? "Strategy"
                            : isBacktest
                              ? "Backtest"
                              : ""}
                        </span>

                        <ButtonGroup className="shrink-0">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            className="rounded-r-none border border-border text-muted-foreground"
                            aria-label="Bookmarked"
                            title="Bookmarked"
                            disabled={removingBookmarkIds.has(item._id)}
                            onClick={() => {
                              setBookmarkPendingRemove(item)
                            }}
                          >
                            {removingBookmarkIds.has(item._id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                className="-ml-px rounded-l-none border border-border text-muted-foreground"
                                aria-label="More actions"
                                title="More actions"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-40 min-w-40"
                            >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {(isStrategy || isBacktest) && targetId ? (
                              <DropdownMenuItem asChild>
                                <a
                                  href={
                                    isBacktest
                                      ? `/backtest/${targetId}`
                                      : `/strategy/${targetId}`
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <SquareArrowOutUpRight className="h-4 w-4" />
                                  Open
                                </a>
                              </DropdownMenuItem>
                            ) : null}
                            {(isStrategy || isBacktest) && targetId ? (
                              <DropdownMenuItem
                                onSelect={() => {
                                  void onCopyBookmarkLink(item)
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                Copy link
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={removingBookmarkIds.has(item._id)}
                              onSelect={() => {
                                setBookmarkPendingRemove(item)
                              }}
                            >
                              {removingBookmarkIds.has(item._id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Remove
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </ButtonGroup>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {description}
                    </p>

                    {isStrategy && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {target?.stats?.viewCount ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                          <Bookmark className="h-3.5 w-3.5" />
                          {target?.stats?.bookmarkCount ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                          {target?.isPublic ? (
                            <Globe className="h-3.5 w-3.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                          {isMine
                            ? "Mine"
                            : target?.isPublic
                              ? "Public"
                              : "Private"}
                        </span>
                      </div>
                    )}

                    {isBacktest && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                          {typeof target?.result?.roi === "number" &&
                          target.result.roi < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <TrendingUp
                              className={`h-3.5 w-3.5 ${
                                typeof target?.result?.roi === "number" &&
                                target.result.roi >= 0
                                  ? "text-success"
                                  : ""
                              }`}
                            />
                          )}
                          <span
                            className={
                              typeof target?.result?.roi === "number"
                                ? target.result.roi >= 0
                                  ? "text-success"
                                  : "text-destructive"
                                : ""
                            }
                          >
                            {target?.result?.roi !== undefined
                              ? `${target.result.roi >= 0 ? "+" : ""}${ratio.format(target.result.roi)}%`
                              : "-"}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                          <Percent className="h-3.5 w-3.5" />
                          {target?.result?.winRate !== undefined
                            ? `${ratio.format(target.result.winRate)}%`
                            : "-"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatDuration(target?.result?.duration)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                          <UserRound className="h-3.5 w-3.5" />@
                          {targetUsername || "unknown"}
                        </span>
                      </div>
                    )}

                    <div className="mt-4">
                      {(isStrategy || isBacktest) && targetId ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          asChild
                        >
                          <a
                            href={
                              isBacktest
                                ? `/backtest/${targetId}`
                                : `/strategy/${targetId}`
                            }
                            className="inline-flex items-center gap-1.5"
                          >
                            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                            Open
                          </a>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled
                        >
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                          Open
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {hasNextPage ? <div ref={loadMoreRef} className="h-1 w-full" /> : null}
        </CardContent>
      </Card>

      <div className="flex h-10 items-center justify-center">
        {isAppending ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more bookmarks...
          </span>
        ) : null}
      </div>

      <AlertDialog
        open={Boolean(bookmarkPendingRemove)}
        onOpenChange={(open) => {
          if (!open) {
            setBookmarkPendingRemove(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bookmark?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">
                {bookmarkPendingRemove?.target?.name ||
                  (bookmarkPendingRemove?.targetType === "backtest"
                    ? `${bookmarkPendingRemove?.target?.symbol || "Backtest"}${bookmarkPendingRemove?.target?.timeframe ? ` • ${bookmarkPendingRemove.target.timeframe}` : ""}`
                    : "this item")}
              </span>{" "}
              from your bookmarks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!bookmarkPendingRemove) return
                void onRemoveBookmark(bookmarkPendingRemove)
                setBookmarkPendingRemove(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
