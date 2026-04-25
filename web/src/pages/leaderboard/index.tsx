import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Compass,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  SquareArrowOutUpRight,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import { deleteBacktest, fetchBacktestLeaderboard } from "@/api/backtest";
import { createBookmark, deleteBookmark } from "@/api/bookmark";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getUserAvatarRingClass,
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

type BacktestSortBy =
  | "createdAt"
  | "updatedAt"
  | "winRate"
  | "roi"
  | "maxDrawdownPercent"
  | "profitFactor";

type BacktestDurationFilter = "all" | "7d" | "1m" | "3m" | "6m" | "1y";

const durationFilterOptions: Array<{
  value: BacktestDurationFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "7d", label: "7D" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
];

type LeaderboardBacktest = {
  _id: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  entryFeeRate?: number;
  exitFeeRate?: number;
  hedgeMode?: boolean;
  createdAt?: string;
  updatedAt?: string;
  strategy?: {
    _id?: string;
    name?: string;
    isPublic?: boolean;
  };
  user?: {
    _id?: string;
    name?: string;
    username?: string;
    avatar?: string;
    membership?: UserMembership;
  };
  isBookmarked?: boolean;
  result: {
    duration: number;
    initialBalance: number;
    finalBalance: number;
    totalPnL: number;
    roi: number;
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdownPercent: number;
    totalFees: number;
  };
};

type LeaderboardResponse = {
  status: boolean;
  message: string;
  result: {
    total?: number;
    hasNextPage?: boolean;
    backtests?: LeaderboardBacktest[];
  };
};

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function mergeBacktestPages(
  prev: LeaderboardBacktest[],
  nextItems: LeaderboardBacktest[],
) {
  return Array.from(
    new Map([...prev, ...nextItems].map((item) => [item._id, item])).values(),
  );
}

function formatDuration(durationMs?: number) {
  if (!Number.isFinite(durationMs) || !durationMs || durationMs <= 0) {
    return "-";
  }

  const totalMinutes = Math.floor(durationMs / 60000);
  const totalHours = Math.floor(durationMs / 3600000);
  const totalDays = Math.floor(durationMs / 86400000);

  if (totalDays >= 1) {
    return `${totalDays}d`;
  }

  if (totalHours >= 1) {
    const hours = totalHours;
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${Math.max(1, totalMinutes)}m`;
}

export default function LeaderboardPage() {
  const user = useAuthStore((state) => state.user);
  const [backtests, setBacktests] = useState<LeaderboardBacktest[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [source, setSource] = useState<"all" | "me">("all");
  const [duration, setDuration] = useState<BacktestDurationFilter>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<BacktestSortBy>("roi");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [backtestIdPendingDelete, setBacktestIdPendingDelete] = useState("");
  const [isDeletingBacktest, setIsDeletingBacktest] = useState(false);
  const [updatingBacktestIds, setUpdatingBacktestIds] = useState<Set<string>>(
    new Set(),
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const previousDebouncedSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const isSearchTriggeredFetch =
        debouncedSearch !== previousDebouncedSearchRef.current;

      if (page === 1 && isSearchTriggeredFetch) {
        setIsSearching(true);
      } else if (page === 1) {
        setIsLoading(true);
      } else {
        setIsAppending(true);
      }

      try {
        const response = (await fetchBacktestLeaderboard({
          page,
          search: debouncedSearch,
          source,
          duration,
          sortBy,
          order,
        })) as LeaderboardResponse;

        const result = response?.result;
        const pageItems = result?.backtests ?? [];

        if (requestIdRef.current !== requestId) {
          return;
        }

        setBacktests((prev) => {
          if (page === 1) {
            return pageItems;
          }

          return mergeBacktestPages(prev, pageItems);
        });

        setTotalCount(result?.total ?? 0);
        setHasNextPage(Boolean(result?.hasNextPage));
        previousDebouncedSearchRef.current = debouncedSearch;
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        toast.error(getApiErrorMessage(error, "Failed to load leaderboard"));
      } finally {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
          setIsLoading(false);
          setIsAppending(false);
        }
      }
    };

    void loadLeaderboard();
  }, [page, debouncedSearch, source, duration, sortBy, order]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage || isLoading || isAppending || isSearching) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (
          firstEntry?.isIntersecting &&
          !isAppending &&
          !isLoading &&
          !isSearching &&
          search.trim() === debouncedSearch
        ) {
          setPage((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: "220px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    debouncedSearch,
    hasNextPage,
    isAppending,
    isLoading,
    isSearching,
    search,
  ]);

  const isSearchPending = search.trim() !== debouncedSearch;
  const listStatus =
    isSearchPending || isSearching ? "searching" : isLoading ? "loading" : null;

  const onCopyResultLink = async (backtestId: string) => {
    const resultUrl = `${window.location.origin}/backtest/${backtestId}`;

    try {
      await navigator.clipboard.writeText(resultUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const onToggleBacktestBookmark = async (backtestId: string) => {
    if (!user?._id) {
      toast.error("Please sign in to bookmark backtests.");
      return;
    }

    const currentBacktest = backtests.find((item) => item._id === backtestId);
    if (!currentBacktest) return;

    const isBookmarked = Boolean(currentBacktest.isBookmarked);

    setUpdatingBacktestIds((prev) => new Set(prev).add(backtestId));

    try {
      if (isBookmarked) {
        const response = await deleteBookmark({
          targetType: "backtest",
          targetId: backtestId,
        });

        setBacktests((prev) =>
          prev.map((item) =>
            item._id === backtestId ? { ...item, isBookmarked: false } : item,
          ),
        );

        toast.success(response?.message || "Bookmark removed successfully.");
        return;
      }

      const response = await createBookmark({
        targetType: "backtest",
        target: backtestId,
      });

      setBacktests((prev) =>
        prev.map((item) =>
          item._id === backtestId ? { ...item, isBookmarked: true } : item,
        ),
      );

      toast.success(response?.message || "Bookmarked successfully.");
    } catch (error) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response
          ?.status === "number"
          ? (error as { response?: { status?: number } }).response!.status
          : undefined;

      if (isBookmarked && status === 404) {
        setBacktests((prev) =>
          prev.map((item) =>
            item._id === backtestId ? { ...item, isBookmarked: false } : item,
          ),
        );
        toast.success("Bookmark removed successfully.");
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update bookmark"));
    } finally {
      setUpdatingBacktestIds((prev) => {
        const next = new Set(prev);
        next.delete(backtestId);
        return next;
      });
    }
  };

  const onDeleteBacktest = async () => {
    if (!backtestIdPendingDelete) {
      return;
    }

    setIsDeletingBacktest(true);

    try {
      const promise = deleteBacktest(backtestIdPendingDelete);

      await promise;

      setBacktests((prev) =>
        prev.filter((item) => item._id !== backtestIdPendingDelete),
      );
      setTotalCount((prev) => Math.max(0, prev - 1));
      setBacktestIdPendingDelete("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete backtest"));
    } finally {
      setIsDeletingBacktest(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden md:space-y-6">
      <Card className="min-w-0 border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                Performance Arena
              </span>
              <CardTitle>
                Leaderboard Results
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 text-sm leading-6">
                Search by symbol, strategy, trader, or timeframe.
                <span className="hidden items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground md:inline-flex">
                  {totalCount} results
                </span>
              </CardDescription>
              <div className="pt-1 md:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {totalCount} results
                </span>
              </div>
            </div>
          </div>

          <Tabs
            value={source}
            onValueChange={(value) => {
              setSource(value as "all" | "me");
              setPage(1);
            }}
          >
            <div className="flex flex-col gap-3 py-1 md:flex-row md:items-center md:justify-between">
              <TabsList
                variant="line"
                className="w-full justify-start md:w-auto"
              >
                <TabsTrigger
                  value="all"
                  aria-label="Explore"
                  title="Explore"
                  className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
                >
                  <Compass className="h-4 w-4 shrink-0" />
                  <span className="hidden group-data-[state=active]:inline md:inline">
                    Explore
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="me"
                  aria-label="Me"
                  title="Me"
                  className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
                >
                  <UserRound className="h-4 w-4 shrink-0" />
                  <span className="hidden group-data-[state=active]:inline md:inline">
                    Me
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="relative min-w-0 w-full md:max-w-[320px] md:flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search"
                  className="rounded-md border-0 border-b-2 border-foreground/15 bg-muted/60 pr-10 pl-9 focus-visible:border-primary focus-visible:ring-0 dark:bg-input/30"
                />
                <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
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
                          const nextSortBy = value as BacktestSortBy;
                          setSortBy(nextSortBy);
                          setOrder(
                            nextSortBy === "roi" ||
                              nextSortBy === "winRate" ||
                              nextSortBy === "profitFactor" ||
                              nextSortBy === "createdAt" ||
                              nextSortBy === "updatedAt"
                              ? "desc"
                              : "asc",
                          );
                          setPage(1);
                        }}
                      >
                        <DropdownMenuRadioItem value="maxDrawdownPercent">
                          Max Drawdown
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="updatedAt">
                          Last Updated
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="createdAt">
                          Newest
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="profitFactor">
                          Profit Factor
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="roi">
                          ROI
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="winRate">
                          Win Rate
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Order</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={order}
                        onValueChange={(value) => {
                          setOrder(value as "asc" | "desc");
                          setPage(1);
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
            </div>
          </Tabs>

          <Tabs
            value={duration}
            onValueChange={(value) => {
              setDuration(value as BacktestDurationFilter);
              setPage(1);
            }}
          >
            <TabsList
              variant="line"
              className="w-full justify-start py-1 md:w-fit"
            >
              {durationFilterOptions.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary md:flex-none"
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
      </Card>

      {listStatus ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          {listStatus === "searching" ? (
            <>
              <Search className="h-4 w-4 animate-pulse" />
              <span>Searching leaderboard....</span>
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading leaderboard....</span>
            </>
          )}
        </div>
      ) : backtests.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          No leaderboard results found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {backtests.map((backtest) => {
            const isMine =
              Boolean(user?._id) && backtest.user?._id === user?._id;

            return (
              <Card
                key={backtest._id}
                className="cursor-pointer overflow-hidden border-0 transition-colors hover:bg-muted/60"
                role="link"
                tabIndex={0}
                onClick={(event) => {
                  const clickTarget = event.target as HTMLElement;
                  if (
                    clickTarget.closest(
                      "button, a, input, textarea, select, [role='menuitem']",
                    )
                  ) {
                    return;
                  }

                  window.location.href = `/backtest/${backtest._id}`;
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;

                  event.preventDefault();
                  window.location.href = `/backtest/${backtest._id}`;
                }}
              >
                <CardHeader className="space-y-2 pb-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          size="sm"
                          className={getUserAvatarRingClass(backtest.user?.membership)}
                        >
                          <AvatarImage
                            src={backtest.user?.avatar}
                            alt={backtest.user?.username || "Trader"}
                          />
                          <AvatarFallback>
                            {(
                              backtest.user?.username?.trim()?.[0] ||
                              backtest.user?.name?.trim()?.[0] ||
                              "U"
                            ).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="min-w-0 truncate">
                          {backtest.symbol}
                        </CardTitle>
                      </div>
                      <CardDescription className="inline-flex min-w-0 items-center gap-1 truncate text-xs">
                        <span className="truncate">
                          @{backtest.user?.username || "unknown"}
                        </span>
                        <UserMembershipMark
                          membership={backtest.user?.membership}
                          className="size-3"
                        />
                      </CardDescription>
                      <CardDescription className="flex min-w-0 flex-wrap items-center gap-2">
                        <span>{backtest.timeframe}</span>
                        <span className="text-muted-foreground/60">-</span>
                        <span className="inline-flex min-w-0 items-center">
                          <span className="max-w-[180px] truncate">
                            {backtest.strategy?.name || "Strategy"}
                          </span>
                        </span>
                      </CardDescription>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="px-1 py-1 text-right">
                        <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                          ROI
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-base font-semibold",
                            backtest.result.roi >= 0
                              ? "text-success"
                              : "text-destructive",
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
                          variant="ghost"
                          className="rounded-r-none border-transparent text-muted-foreground shadow-none"
                          aria-label={
                            backtest.isBookmarked ? "Bookmarked" : "Bookmark"
                          }
                          title={
                            backtest.isBookmarked ? "Bookmarked" : "Bookmark"
                          }
                          disabled={updatingBacktestIds.has(backtest._id)}
                          onClick={() => {
                            void onToggleBacktestBookmark(backtest._id);
                          }}
                        >
                          {updatingBacktestIds.has(backtest._id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : backtest.isBookmarked ? (
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
                              variant="ghost"
                              className="-ml-px rounded-l-none border-transparent text-muted-foreground shadow-none"
                              aria-label="More actions"
                              title="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
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
                                void onCopyResultLink(backtest._id);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                void onToggleBacktestBookmark(backtest._id);
                              }}
                              disabled={updatingBacktestIds.has(backtest._id)}
                            >
                              {backtest.isBookmarked ? (
                                <BookmarkCheck className="h-4 w-4" />
                              ) : (
                                <Bookmark className="h-4 w-4" />
                              )}
                              {backtest.isBookmarked
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
                                    setBacktestIdPendingDelete(backtest._id);
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
                </CardHeader>

                <CardContent className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/70 p-2">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Duration
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDuration(backtest.result.duration)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/70 p-2">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Win Rate
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {ratio.format(backtest.result.winRate)}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/70 p-2">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Profit Factor
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {ratio.format(backtest.result.profitFactor)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/70 p-2">
                      <p className="text-[11px] text-muted-foreground uppercase">
                        Drawdown
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        -
                        {ratio.format(
                          Math.abs(backtest.result.maxDrawdownPercent),
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div ref={loadMoreRef} className="flex h-10 items-center justify-center">
        {isAppending && !listStatus ? (
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
            setBacktestIdPendingDelete("");
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
              variant="destructive"
              className="relative !bg-destructive !text-white hover:!bg-destructive/90"
              disabled={isDeletingBacktest}
              onClick={(event) => {
                event.preventDefault();
                void onDeleteBacktest();
              }}
            >
              {isDeletingBacktest ? (
                <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
              ) : null}
              <span className={isDeletingBacktest ? "opacity-0" : undefined}>
                Delete
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
