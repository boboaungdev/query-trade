import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  ChevronDown,
  Copy,
  CopyPlus,
  Compass,
  Globe,
  Pencil,
  SquareArrowOutUpRight,
  Layers3,
  Loader2,
  Lock,
  ListFilter,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import {
  deleteStrategy,
  fetchStrategies,
  type StrategySource,
} from "@/api/strategy"
import { getApiErrorMessage } from "@/api/axios"
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

type StrategySortBy = "name" | "createdAt" | "updatedAt" | "popular"

type StrategyItem = {
  _id: string
  name: string
  description?: string
  isPublic?: boolean
  stats?: {
    viewCount?: number
    bookmarkCount?: number
  }
  user?: {
    _id?: string
    username?: string
  }
  createdAt?: string
  updatedAt?: string
  indicators?: unknown[]
}

type StrategyListResult = {
  total?: number
  hasNextPage?: boolean
  strategies?: StrategyItem[]
}

type StrategyListResponse = {
  status: boolean
  message: string
  result: StrategyListResult
}

function mergeStrategyPages(prev: StrategyItem[], nextItems: StrategyItem[]) {
  return Array.from(
    new Map([...prev, ...nextItems].map((item) => [item._id, item])).values()
  )
}

function toPrettyDate(date?: string) {
  if (!date) return "-"

  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return "-"

  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

export default function StrategyPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [strategies, setStrategies] = useState<StrategyItem[]>([])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAppending, setIsAppending] = useState(false)
  const [strategyIdPendingDelete, setStrategyIdPendingDelete] = useState("")
  const [isDeletingStrategy, setIsDeletingStrategy] = useState(false)
  const [source, setSource] = useState<StrategySource>("all")
  const [sortBy, setSortBy] = useState<StrategySortBy>("name")
  const [order, setOrder] = useState<"asc" | "desc">("asc")
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const bookmarkedStrategyIds = useBookmarkStore(
    (state) => state.bookmarkedStrategyIds
  )
  const updatingStrategyIds = useBookmarkStore(
    (state) => state.updatingStrategyIds
  )
  const loadStrategyBookmarks = useBookmarkStore(
    (state) => state.loadStrategyBookmarks
  )
  const toggleStrategyBookmark = useBookmarkStore(
    (state) => state.toggleStrategyBookmark
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const loadStrategies = async () => {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsAppending(true)
      }

      try {
        const response = (await fetchStrategies({
          page,
          search: debouncedSearch,
          sortBy,
          order,
          source,
          isPublic: source === "all" ? true : undefined,
        })) as StrategyListResponse

        const result = response?.result
        const pageItems = result?.strategies ?? []

        setStrategies((prev) => {
          if (page === 1) {
            return pageItems
          }

          return mergeStrategyPages(prev, pageItems)
        })

        setTotalCount(result?.total ?? 0)
        setHasNextPage(Boolean(result?.hasNextPage))
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load strategies"))
      } finally {
        setIsLoading(false)
        setIsAppending(false)
      }
    }

    void loadStrategies()
  }, [page, debouncedSearch, sortBy, order, source])

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
    void loadStrategyBookmarks().catch((error) => {
      toast.error(getApiErrorMessage(error, "Failed to load bookmarks"))
    })
  }, [loadStrategyBookmarks])

  const onToggleBookmark = async (strategyId: string) => {
    const isBookmarked = bookmarkedStrategyIds.has(strategyId)
    const updateStrategyBookmarkCount = (delta: 1 | -1) => {
      setStrategies((prev) =>
        prev.map((item) => {
          if (item._id !== strategyId) return item

          const current =
            typeof item.stats?.bookmarkCount === "number"
              ? item.stats.bookmarkCount
              : 0
          const next = Math.max(0, current + delta)

          return {
            ...item,
            stats: {
              ...item.stats,
              bookmarkCount: next,
            },
          }
        })
      )
    }

    const result = await toggleStrategyBookmark(strategyId)
    if (!result) {
      return
    }

    if (result.status === "success") {
      if (isBookmarked) {
        updateStrategyBookmarkCount(-1)
      } else {
        updateStrategyBookmarkCount(1)
      }
      toast.success(result.message)
      return
    }

    toast.error(result.message)
  }

  const onDeleteStrategy = async () => {
    if (!strategyIdPendingDelete) return

    try {
      setIsDeletingStrategy(true)
      await deleteStrategy(strategyIdPendingDelete)

      setStrategies((prev) =>
        prev.filter((item) => item._id !== strategyIdPendingDelete)
      )
      setTotalCount((prev) => Math.max(0, prev - 1))
      toast.success("Strategy deleted successfully")
      setStrategyIdPendingDelete("")
    } catch (error: unknown) {
      const responseMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message
          : null

      toast.error(
        responseMessage ??
          (error instanceof Error ? error.message : "Failed to delete strategy")
      )
    } finally {
      setIsDeletingStrategy(false)
    }
  }

  const onCopyStrategyLink = async (strategyId: string) => {
    const strategyUrl = `${window.location.origin}/strategy/${strategyId}`

    try {
      await navigator.clipboard.writeText(strategyUrl)
      toast.success("Link copied")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy link"))
    }
  }

  const onCloneStrategy = (strategy: StrategyItem) => {
    navigate("/strategy/create", {
      state: {
        duplicateStrategyId: strategy._id,
        duplicateStrategyName: strategy.name,
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <section className="theme-hero-panel relative overflow-hidden rounded-2xl border p-4 sm:p-6">
        <div className="theme-hero-overlay absolute inset-0" />

        <div className="relative flex flex-col gap-3">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Strategy Studio
          </p>

          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-4xl">
            <Target className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
            Build And Manage Strategies
          </h1>

          <p className="max-w-3xl text-muted-foreground">
            Explore all strategies, inspect ownership and indicators, and jump
            directly into creation or backtest workflows.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              Strategy inventory
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Backtest ready flow
            </span>
          </div>
        </div>
      </section>

      <Card className="min-w-0 border-border/70">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Strategy Catalog</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                Search by strategy name or creator.
                <span className="hidden items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground sm:inline-flex">
                  {totalCount} strategies
                </span>
              </CardDescription>
              <div className="pt-1 sm:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {totalCount} strategies
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" asChild>
                <a
                  href="/strategy/create"
                  className="inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Create
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className="pr-10 pl-9"
                />
                <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
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
                          const nextSortBy = value as StrategySortBy
                          setSortBy(nextSortBy)
                          if (nextSortBy === "popular") {
                            setOrder("desc")
                          }
                          if (nextSortBy === "name") {
                            setOrder("asc")
                          }
                          if (
                            nextSortBy === "createdAt" ||
                            nextSortBy === "updatedAt"
                          ) {
                            setOrder("desc")
                          }
                          setPage(1)
                        }}
                      >
                        <DropdownMenuRadioItem value="popular">
                          Popular
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="name">
                          Name
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="createdAt">
                          Newest
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="updatedAt">
                          Last updated
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
                        <DropdownMenuRadioItem value="asc">
                          Ascending
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="desc">
                          Descending
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                  variant={source === "mine" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => {
                    setSource("mine")
                    setPage(1)
                  }}
                >
                  <UserRound className="h-4 w-4" />
                  Me
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Loading strategies...
            </div>
          ) : strategies.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No strategies found.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {strategies.map((item) => {
                const isMine =
                  Boolean(user?._id) && item.user?._id === user?._id

                return (
                  <article
                    key={item._id}
                    className="min-w-0 rounded-xl border p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 font-semibold">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          by @{item.user?.username || "unknown"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ButtonGroup className="shrink-0">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant={
                              bookmarkedStrategyIds.has(item._id)
                                ? "outline"
                                : "ghost"
                            }
                            className="rounded-r-none border border-border text-muted-foreground"
                            aria-label={
                              bookmarkedStrategyIds.has(item._id)
                                ? "Bookmarked"
                                : "Bookmark"
                            }
                            title={
                              bookmarkedStrategyIds.has(item._id)
                                ? "Bookmarked"
                                : "Bookmark"
                            }
                            disabled={updatingStrategyIds.has(item._id)}
                            onClick={() => {
                              void onToggleBookmark(item._id)
                            }}
                          >
                            {updatingStrategyIds.has(item._id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : bookmarkedStrategyIds.has(item._id) ? (
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
                                variant={
                                  bookmarkedStrategyIds.has(item._id)
                                    ? "outline"
                                    : "ghost"
                                }
                                className="-ml-px rounded-l-none border border-border text-muted-foreground"
                                aria-label="More actions"
                                title="More actions"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 min-w-44"
                            >
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <a
                                  href={`/strategy/${item._id}`}
                                  className="flex items-center gap-2"
                                >
                                  <SquareArrowOutUpRight className="h-4 w-4" />
                                  Open
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  void onCopyStrategyLink(item._id)
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                Copy link
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a
                                  href="/backtest"
                                  className="flex items-center gap-2"
                                >
                                  <CandlestickChart className="h-4 w-4" />
                                  Backtest
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  void onToggleBookmark(item._id)
                                }}
                                disabled={updatingStrategyIds.has(item._id)}
                              >
                                {bookmarkedStrategyIds.has(item._id) ? (
                                  <BookmarkCheck className="h-4 w-4" />
                                ) : (
                                  <Bookmark className="h-4 w-4" />
                                )}
                                {bookmarkedStrategyIds.has(item._id)
                                  ? "Bookmarked"
                                  : "Bookmark"}
                              </DropdownMenuItem>
                              {isMine ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`/strategy/${item._id}/edit`}
                                      className="flex items-center gap-2"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => {
                                      setStrategyIdPendingDelete(item._id)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      onCloneStrategy(item)
                                    }}
                                  >
                                    <CopyPlus className="h-4 w-4" />
                                    Clone
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </ButtonGroup>
                      </div>
                    </div>

                    <p
                      className="max-w-full truncate text-sm text-muted-foreground"
                      title={item.description?.trim() || "No description"}
                    >
                      {item.description?.trim() || "No description"}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {item.stats?.viewCount ?? "-"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        <Bookmark className="h-3.5 w-3.5" />
                        {item.stats?.bookmarkCount ?? "-"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                        {item.isPublic ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        {isMine ? "Mine" : item.isPublic ? "Public" : "Private"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      <p>Created: {toPrettyDate(item.createdAt)}</p>
                      <p>Updated: {toPrettyDate(item.updatedAt)}</p>
                    </div>

                    <div className="mt-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <a
                          href={`/strategy/${item._id}`}
                          className="inline-flex items-center gap-1.5"
                        >
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                          Open
                        </a>
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {hasNextPage && (
            <div className="flex flex-col items-center pt-2">
              <div ref={loadMoreRef} className="h-1 w-full" />
              {isAppending && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading more...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(strategyIdPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingStrategy) {
            setStrategyIdPendingDelete("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete strategy permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The strategy will be removed from
              your list immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingStrategy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void onDeleteStrategy()
              }}
              disabled={isDeletingStrategy}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {isDeletingStrategy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
