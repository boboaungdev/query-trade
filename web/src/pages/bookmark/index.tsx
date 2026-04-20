import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  Copy,
  Globe,
  Loader2,
  Lock,
  ListFilter,
  MoreHorizontal,
  Search,
  SquareArrowOutUpRight,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import {
  deleteBookmark,
  fetchBookmarks,
  type BookmarkTargetType,
} from "@/api/bookmark";
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
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type BookmarkFilter = BookmarkTargetType;

type BookmarkTarget = {
  _id?: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  user?:
    | string
    | { _id?: string; name?: string; username?: string; avatar?: string };
  symbol?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  strategy?: {
    _id?: string;
    name?: string;
    isPublic?: boolean;
  };
  result?: {
    roi?: number;
    winRate?: number;
    profitFactor?: number;
    maxDrawdownPercent?: number;
    duration?: number;
  };
  stats?: {
    viewCount?: number;
    bookmarkCount?: number;
  };
};

type BookmarkItem = {
  _id: string;
  targetType: BookmarkTargetType;
  target?: BookmarkTarget;
  createdAt?: string;
  updatedAt?: string;
};

type BookmarkListResponse = {
  status: boolean;
  message: string;
  result?: {
    total?: number;
    hasNextPage?: boolean;
    bookmarks?: BookmarkItem[];
  };
};

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
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
  }

  return `${Math.max(1, totalMinutes)}m`;
}

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function mergeBookmarks(prev: BookmarkItem[], next: BookmarkItem[]) {
  return Array.from(
    new Map([...prev, ...next].map((item) => [item._id, item])).values(),
  );
}

function hasBookmarkTarget(item: BookmarkItem) {
  return Boolean(item.target?._id);
}

type BookmarkCardRenderProps = {
  item: BookmarkItem;
  userId?: string;
  removingBookmarkIds: Set<string>;
  onOpenBookmark: (bookmark: BookmarkItem) => void;
  onCopyBookmarkLink: (bookmark: BookmarkItem) => Promise<void>;
  onRequestRemove: (bookmark: BookmarkItem) => void;
};

function renderBookmarkStrategyCard({
  item,
  userId,
  removingBookmarkIds,
  onOpenBookmark,
  onCopyBookmarkLink,
  onRequestRemove,
}: BookmarkCardRenderProps) {
  const target = item.target;
  const targetId = target?._id;
  const targetPath = targetId ? `/strategy/${targetId}` : "";
  const targetUserId =
    typeof target?.user === "string" ? target.user : target?.user?._id;
  const targetUserName =
    typeof target?.user === "object" ? target.user?.name?.trim() : "";
  const targetUsername =
    typeof target?.user === "object"
      ? target.user?.username?.trim().replace(/^@/, "")
      : "";
  const targetAvatar =
    typeof target?.user === "object" ? target.user?.avatar : "";
  const isMine = Boolean(userId) && targetUserId === userId;

  return (
    <Card
      key={item._id}
      className={cn(
        "min-w-0 overflow-hidden border-border/70 py-0 transition-colors hover:bg-muted/60",
        targetPath && "cursor-pointer",
      )}
      role={targetPath ? "link" : undefined}
      tabIndex={targetPath ? 0 : undefined}
      onClick={(event) => {
        if (!targetPath) return;

        const clickTarget = event.target as HTMLElement;
        if (
          clickTarget.closest(
            "button, a, input, textarea, select, [role='menuitem']",
          )
        ) {
          return;
        }

        onOpenBookmark(item);
      }}
      onKeyDown={(event) => {
        if (!targetPath) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onOpenBookmark(item);
      }}
    >
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar size="sm">
                <AvatarImage
                  src={targetAvatar}
                  alt={targetUsername || "Creator"}
                />
                <AvatarFallback>
                  {(
                    targetUsername?.[0] ||
                    targetUserName?.[0] ||
                    "U"
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
                {target?.name || "Untitled strategy"}
              </h3>
            </div>

            <div className="truncate text-xs text-muted-foreground">
              @{targetUsername || "unknown"}
            </div>
          </div>

          <ButtonGroup className="shrink-0">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-r-none border-transparent text-muted-foreground shadow-none"
              aria-label="Remove bookmark"
              title="Remove bookmark"
              disabled={removingBookmarkIds.has(item._id)}
              onClick={() => {
                onRequestRemove(item);
              }}
            >
              {removingBookmarkIds.has(item._id) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
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
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 min-w-44">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {targetId ? (
                  <DropdownMenuItem asChild>
                    <a href={targetPath} className="flex items-center gap-2">
                      <SquareArrowOutUpRight className="h-4 w-4" />
                      Open
                    </a>
                  </DropdownMenuItem>
                ) : null}
                {targetId ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      void onCopyBookmarkLink(item);
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
                    onRequestRemove(item);
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

        <p
          className="truncate text-sm text-muted-foreground"
          title={target?.description?.trim() || "No description"}
        >
          {target?.description?.trim() || "No description"}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />@
            <span className="truncate">{targetUsername || "unknown"}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
            {target?.isPublic ? (
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {isMine ? "Mine" : target?.isPublic ? "Public" : "Private"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            {target?.stats?.viewCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
            <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
            {target?.stats?.bookmarkCount ?? 0}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function renderBookmarkBacktestCard({
  item,
  removingBookmarkIds,
  onOpenBookmark,
  onCopyBookmarkLink,
  onRequestRemove,
}: BookmarkCardRenderProps) {
  const target = item.target;
  const targetId = target?._id;
  const targetPath = targetId ? `/backtest/${targetId}` : "";
  const targetUserName =
    typeof target?.user === "object" ? target.user?.name?.trim() : "";
  const targetUsername =
    typeof target?.user === "object"
      ? target.user?.username?.trim().replace(/^@/, "")
      : "";
  const targetAvatar =
    typeof target?.user === "object" ? target.user?.avatar : "";

  return (
    <Card
      key={item._id}
      className="cursor-pointer overflow-hidden border-0 transition-colors hover:bg-muted/60"
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if (!targetPath) return;

        const clickTarget = event.target as HTMLElement;
        if (
          clickTarget.closest(
            "button, a, input, textarea, select, [role='menuitem']",
          )
        ) {
          return;
        }

        onOpenBookmark(item);
      }}
      onKeyDown={(event) => {
        if (!targetPath) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onOpenBookmark(item);
      }}
    >
      <CardHeader className="space-y-2 pb-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar size="sm">
                <AvatarImage
                  src={targetAvatar}
                  alt={targetUsername || "Trader"}
                />
                <AvatarFallback>
                  {(
                    targetUsername?.[0] ||
                    targetUserName?.[0] ||
                    "U"
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="min-w-0 truncate text-base font-semibold">
                {target?.symbol || "Backtest"}
              </CardTitle>
            </div>
            <CardDescription className="truncate text-xs">
              @{targetUsername || "unknown"}
            </CardDescription>
            <CardDescription className="flex min-w-0 flex-wrap items-center gap-2">
              <span>{target?.timeframe || "-"}</span>
              <span className="text-muted-foreground/60">-</span>
              <span className="inline-flex min-w-0 items-center">
                <span className="max-w-[180px] truncate">
                  {target?.strategy?.name || "Strategy"}
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
                  typeof target?.result?.roi === "number"
                    ? target.result.roi >= 0
                      ? "text-success"
                      : "text-destructive"
                    : "text-foreground",
                )}
              >
                {typeof target?.result?.roi === "number"
                  ? `${target.result.roi >= 0 ? "+" : ""}${ratio.format(target.result.roi)}%`
                  : "-"}
              </p>
            </div>

            <ButtonGroup className="shrink-0">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="rounded-r-none border-transparent text-muted-foreground shadow-none"
                aria-label="Remove bookmark"
                title="Remove bookmark"
                disabled={removingBookmarkIds.has(item._id)}
                onClick={() => {
                  onRequestRemove(item);
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
                    variant="ghost"
                    className="-ml-px rounded-l-none border-transparent text-muted-foreground shadow-none"
                    aria-label="More actions"
                    title="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 min-w-44">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {targetId ? (
                    <DropdownMenuItem asChild>
                      <a href={targetPath} className="flex items-center gap-2">
                        <SquareArrowOutUpRight className="h-4 w-4" />
                        Open
                      </a>
                    </DropdownMenuItem>
                  ) : null}
                  {targetId ? (
                    <DropdownMenuItem
                      onSelect={() => {
                        void onCopyBookmarkLink(item);
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
                      onRequestRemove(item);
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
      </CardHeader>

      <CardContent className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/70 p-2">
            <p className="text-[11px] text-muted-foreground uppercase">
              Duration
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDuration(target?.result?.duration)}
            </p>
          </div>

          <div className="rounded-xl bg-muted/70 p-2">
            <p className="text-[11px] text-muted-foreground uppercase">
              Win Rate
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {typeof target?.result?.winRate === "number"
                ? `${ratio.format(target.result.winRate)}%`
                : "-"}
            </p>
          </div>

          <div className="rounded-xl bg-muted/70 p-2">
            <p className="text-[11px] text-muted-foreground uppercase">
              Profit Factor
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {typeof target?.result?.profitFactor === "number"
                ? ratio.format(target.result.profitFactor)
                : "-"}
            </p>
          </div>

          <div className="rounded-xl bg-muted/70 p-2">
            <p className="text-[11px] text-muted-foreground uppercase">
              Drawdown
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {typeof target?.result?.maxDrawdownPercent === "number"
                ? `-${ratio.format(Math.abs(target.result.maxDrawdownPercent))}%`
                : "-"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookmarkPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [filter, setFilter] = useState<BookmarkFilter>("backtest");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasNextPageRef = useRef(false);
  const isLoadingRef = useRef(true);
  const isAppendingRef = useRef(false);
  const totalCountRef = useRef(0);
  const loadedCountRef = useRef(0);
  const previousDebouncedSearchRef = useRef(debouncedSearch);
  const [removingBookmarkIds, setRemovingBookmarkIds] = useState<Set<string>>(
    new Set(),
  );
  const [bookmarkPendingRemove, setBookmarkPendingRemove] =
    useState<BookmarkItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const loadBookmarks = async () => {
      if (
        page > 1 &&
        totalCountRef.current > 0 &&
        loadedCountRef.current >= totalCountRef.current
      ) {
        hasNextPageRef.current = false;
        isAppendingRef.current = false;
        setHasNextPage(false);
        setIsAppending(false);
        return;
      }

      const isSearchTriggeredFetch =
        debouncedSearch !== previousDebouncedSearchRef.current;

      if (page === 1 && isSearchTriggeredFetch) {
        isLoadingRef.current = false;
        setIsSearching(true);
      } else if (page === 1) {
        isLoadingRef.current = true;
        setIsLoading(true);
      } else {
        isAppendingRef.current = true;
        setIsAppending(true);
      }

      try {
        const response = (await fetchBookmarks({
          page,
          targetType: filter,
          search: debouncedSearch,
          sortBy,
          order,
        })) as BookmarkListResponse;

        const nextItems = (response?.result?.bookmarks ?? []).filter(
          hasBookmarkTarget,
        );

        setBookmarks((prev) => {
          if (page === 1) {
            return nextItems;
          }
          return mergeBookmarks(prev, nextItems);
        });

        const nextTotalCount = response?.result?.total ?? 0;
        const nextLoadedCount =
          page === 1
            ? nextItems.length
            : Math.min(
                totalCountRef.current || nextTotalCount,
                loadedCountRef.current + nextItems.length,
              );
        const nextHasNextPage =
          Boolean(response?.result?.hasNextPage) &&
          nextLoadedCount < nextTotalCount &&
          nextItems.length > 0;

        loadedCountRef.current = nextLoadedCount;
        totalCountRef.current = nextTotalCount;
        setTotalCount(nextTotalCount);
        hasNextPageRef.current = nextHasNextPage;
        setHasNextPage(nextHasNextPage);
        previousDebouncedSearchRef.current = debouncedSearch;
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load bookmarks"));
      } finally {
        isLoadingRef.current = false;
        isAppendingRef.current = false;
        setIsSearching(false);
        setIsLoading(false);
        setIsAppending(false);
      }
    };

    void loadBookmarks();
  }, [debouncedSearch, filter, order, page, sortBy]);

  useEffect(() => {
    hasNextPageRef.current = hasNextPage;
  }, [hasNextPage]);

  useEffect(() => {
    totalCountRef.current = totalCount;
  }, [totalCount]);

  useEffect(() => {
    loadedCountRef.current = bookmarks.length;
  }, [bookmarks]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isAppendingRef.current = isAppending;
  }, [isAppending]);

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
          hasNextPageRef.current &&
          !isAppendingRef.current &&
          !isLoadingRef.current &&
          !isSearching &&
          search.trim() === debouncedSearch
        ) {
          isAppendingRef.current = true;
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

  const onCopyBookmarkLink = async (bookmark: BookmarkItem) => {
    const targetId = bookmark.target?._id;
    const targetPath =
      bookmark.targetType === "backtest"
        ? `/backtest/${targetId}`
        : bookmark.targetType === "strategy"
          ? `/strategy/${targetId}`
          : "";

    if (!targetId || !targetPath) {
      toast.error("Missing target link");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${targetPath}`,
      );
      toast.success("Link copied");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy link"));
    }
  };

  const getBookmarkTargetPath = (bookmark: BookmarkItem) => {
    const targetId = bookmark.target?._id;

    if (!targetId) return null;

    if (bookmark.targetType === "backtest") {
      return `/backtest/${targetId}`;
    }

    if (bookmark.targetType === "strategy") {
      return `/strategy/${targetId}`;
    }

    return null;
  };

  const onOpenBookmark = (bookmark: BookmarkItem) => {
    const targetPath = getBookmarkTargetPath(bookmark);

    if (!targetPath) return;

    navigate(targetPath);
  };

  const onRemoveBookmark = async (bookmark: BookmarkItem) => {
    const targetId = bookmark.target?._id;
    if (!targetId) {
      toast.error("Missing target id");
      return;
    }

    setRemovingBookmarkIds((prev) => {
      const next = new Set(prev);
      next.add(bookmark._id);
      return next;
    });

    try {
      await deleteBookmark({
        targetType: bookmark.targetType,
        targetId,
      });

      setBookmarks((prev) => prev.filter((item) => item._id !== bookmark._id));
      setTotalCount((prev) => Math.max(0, prev - 1));

      toast.success("Bookmark removed");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove bookmark"));
    } finally {
      setRemovingBookmarkIds((prev) => {
        const next = new Set(prev);
        next.delete(bookmark._id);
        return next;
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden md:space-y-6">
      <Card className="min-w-0 border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                Bookmark Hub
              </span>
              <CardTitle className="text-xl tracking-tight">
                Bookmarks
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 text-sm leading-6">
                Browse, filter, and manage your bookmarks.
                <span className="hidden items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground md:inline-flex">
                  {totalCount} bookmarks
                </span>
              </CardDescription>
              <div className="pt-1 md:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {totalCount} bookmarks
                </span>
              </div>
            </div>
          </div>

          <Tabs
            value={filter}
            onValueChange={(value) => {
              setFilter(value as BookmarkFilter);
              setPage(1);
            }}
          >
            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <TabsList
                variant="line"
                className="w-full justify-start md:w-auto"
              >
                <TabsTrigger
                  value="backtest"
                  aria-label="Backtests"
                  title="Backtests"
                  className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
                >
                  <CandlestickChart className="h-4 w-4 shrink-0" />
                  <span className="hidden group-data-[state=active]:inline md:inline">
                    Backtests
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="strategy"
                  aria-label="Strategies"
                  title="Strategies"
                  className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
                >
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <span className="hidden group-data-[state=active]:inline md:inline">
                    Strategies
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
                <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 shrink-0"
                      >
                        <ListFilter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={sortBy}
                        onValueChange={(value) => {
                          setSortBy(value as "createdAt" | "updatedAt");
                          setPage(1);
                        }}
                      >
                        <DropdownMenuRadioItem value="createdAt">
                          Bookmarked date
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
        </CardHeader>
      </Card>

      {listStatus ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          {listStatus === "searching" ? (
            <>
              <Search className="h-4 w-4 animate-pulse" />
              <span>Searching bookmarks....</span>
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading bookmarks....</span>
            </>
          )}
        </div>
      ) : totalCount === 0 ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          {search.trim()
            ? "No bookmarks matched your search."
            : "No bookmarks yet."}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bookmarks.map((item) => {
              return item.targetType === "strategy"
                ? renderBookmarkStrategyCard({
                    item,
                    userId: user?._id,
                    removingBookmarkIds,
                    onOpenBookmark,
                    onCopyBookmarkLink,
                    onRequestRemove: setBookmarkPendingRemove,
                  })
                : renderBookmarkBacktestCard({
                    item,
                    userId: user?._id,
                    removingBookmarkIds,
                    onOpenBookmark,
                    onCopyBookmarkLink,
                    onRequestRemove: setBookmarkPendingRemove,
                  });
            })}
          </div>

          {hasNextPage ? (
            <div ref={loadMoreRef} className="h-1 w-full" />
          ) : null}
        </>
      )}

      <div className="flex h-10 items-center justify-center">
        {isAppending && !listStatus ? (
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
            setBookmarkPendingRemove(null);
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
                    ? `${bookmarkPendingRemove?.target?.symbol || "Backtest"}${bookmarkPendingRemove?.target?.timeframe ? ` - ${bookmarkPendingRemove.target.timeframe}` : ""}`
                    : "this item")}
              </span>{" "}
              from your bookmarks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="!bg-destructive !text-white hover:!bg-destructive/90"
              onClick={() => {
                if (!bookmarkPendingRemove) return;
                void onRemoveBookmark(bookmarkPendingRemove);
                setBookmarkPendingRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
