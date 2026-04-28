import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  ChevronLeft,
  ChevronsUpDown,
  CirclePlus,
  CircleHelp,
  Copy,
  CopyPlus,
  Compass,
  Eye,
  Globe,
  Pencil,
  SquareArrowOutUpRight,
  Loader2,
  Lock,
  ListFilter,
  Plus,
  BadgeDollarSign,
  Search,
  Settings2,
  Trash2,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  UserRound,
  HandCoins,
} from "lucide-react";
import { toast } from "sonner";

import { createBookmark, deleteBookmark } from "@/api/bookmark";
import {
  createStrategy,
  deleteStrategy,
  fetchStrategyById,
  fetchStrategies,
  updateStrategy,
  type CreateStrategyPayload,
  type StrategyAccessState,
  type StrategyAccessType,
  type StrategyCategory,
  type StrategyFilterType,
  type StrategyCondition,
  type StrategyLogicBlock,
} from "@/api/strategy";
import { getApiErrorMessage } from "@/api/axios";
import { fetchIndicators } from "@/api/indicator";
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
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getUserAvatarRingClass,
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
import { useAuthStore } from "@/store/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type StrategySortBy = "name" | "createdAt" | "updatedAt" | "popular";

type StrategyItem = {
  _id: string;
  name: string;
  description?: string;
  isBookmarked?: boolean;
  isPublic?: boolean;
  accessType?: StrategyAccessType;
  access?: StrategyAccessState;
  stats?: {
    viewCount?: number;
    bookmarkCount?: number;
  };
  user?: {
    _id?: string;
    avatar?: string;
    name?: string;
    username?: string;
    membership?: UserMembership;
  };
  createdAt?: string;
  updatedAt?: string;
  indicators?: unknown[];
};

type StrategyListResult = {
  total?: number;
  hasNextPage?: boolean;
  strategies?: StrategyItem[];
};

type StrategyListResponse = {
  status: boolean;
  message: string;
  result: StrategyListResult;
};

function mergeStrategyPages(prev: StrategyItem[], nextItems: StrategyItem[]) {
  return Array.from(
    new Map([...prev, ...nextItems].map((item) => [item._id, item])).values(),
  );
}

function getStrategyPlanTier(membership?: UserMembership) {
  const rawPlan =
    membership?.plan ?? membership?.verifiedVariant ?? membership?.badgeVariant;
  const normalizedPlan = String(rawPlan ?? "free")
    .trim()
    .toLowerCase();

  if (normalizedPlan === "pro") return "pro";
  if (normalizedPlan === "plus") return "plus";

  return "free";
}

function getStrategyIndicatorLimit(planTier: "free" | "plus" | "pro") {
  if (planTier === "pro") return 10;
  if (planTier === "plus") return 5;
  return 2;
}

function getStrategyRuleLimit(planTier: "free" | "plus" | "pro") {
  if (planTier === "pro") return 10;
  if (planTier === "plus") return 5;
  return 2;
}

function getStrategyPlanLabel(planTier: "free" | "plus" | "pro") {
  if (planTier === "pro") return "Pro";
  if (planTier === "plus") return "Plus";
  return "Free";
}

export default function StrategyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isMobile = useIsMobile();
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [strategyIdPendingDelete, setStrategyIdPendingDelete] = useState("");
  const [isDeletingStrategy, setIsDeletingStrategy] = useState(false);
  const [updatingStrategyIds, setUpdatingStrategyIds] = useState<Set<string>>(
    new Set(),
  );
  const [category, setCategory] = useState<StrategyCategory>("all");
  const [typeFilter, setTypeFilter] = useState<StrategyFilterType>("all");
  const [sortBy, setSortBy] = useState<StrategySortBy>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [sheetStrategyId, setSheetStrategyId] = useState("");
  const [duplicateSheetStrategyId, setDuplicateSheetStrategyId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [createSheetControls, setCreateSheetControls] =
    useState<StrategyBuilderFooterControls | null>(null);
  const [createSheetDragOffset, setCreateSheetDragOffset] = useState(0);
  const [isCreateSheetDragging, setIsCreateSheetDragging] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const createSheetBodyRef = useRef<HTMLDivElement | null>(null);
  const createSheetDragPointerIdRef = useRef<number | null>(null);
  const createSheetDragStartYRef = useRef(0);
  const createSheetDragLastYRef = useRef(0);
  const createSheetDragSourceRef = useRef<"header" | "body" | null>(null);
  const previousDebouncedSearchRef = useRef(debouncedSearch);
  const shouldOpenStrategyBuilder =
    typeof location.state === "object" &&
    location.state !== null &&
    "openStrategyBuilder" in location.state &&
    Boolean(
      (location.state as { openStrategyBuilder?: unknown }).openStrategyBuilder,
    );
  const routeSheetStrategyId =
    typeof location.state === "object" &&
    location.state !== null &&
    "editStrategyId" in location.state &&
    typeof (location.state as { editStrategyId?: unknown }).editStrategyId ===
      "string"
      ? (location.state as { editStrategyId: string }).editStrategyId
      : "";
  const routeDuplicateStrategyId =
    typeof location.state === "object" &&
    location.state !== null &&
    "duplicateStrategyId" in location.state &&
    typeof (location.state as { duplicateStrategyId?: unknown })
      .duplicateStrategyId === "string"
      ? (location.state as { duplicateStrategyId: string }).duplicateStrategyId
      : "";

  useEffect(() => {
    if (shouldOpenStrategyBuilder) {
      setSheetStrategyId(routeSheetStrategyId);
      setDuplicateSheetStrategyId(routeDuplicateStrategyId);
      setIsCreateSheetOpen(true);
    }
  }, [
    routeDuplicateStrategyId,
    routeSheetStrategyId,
    shouldOpenStrategyBuilder,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const loadStrategies = async () => {
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
        const response = (await fetchStrategies({
          page,
          search: debouncedSearch,
          sortBy,
          order,
          category,
          type: typeFilter,
          isPublic: category === "all" ? true : undefined,
        })) as StrategyListResponse;

        const result = response?.result;
        const pageItems = result?.strategies ?? [];

        setStrategies((prev) => {
          if (page === 1) {
            return pageItems;
          }

          return mergeStrategyPages(prev, pageItems);
        });

        setTotalCount(result?.total ?? 0);
        setHasNextPage(Boolean(result?.hasNextPage));
        previousDebouncedSearchRef.current = debouncedSearch;
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load strategies"));
      } finally {
        setIsSearching(false);
        setIsLoading(false);
        setIsAppending(false);
      }
    };

    void loadStrategies();
  }, [page, debouncedSearch, sortBy, order, category, typeFilter, reloadKey]);

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

  const onToggleBookmark = async (strategyId: string) => {
    if (!user?._id) {
      toast.error("Please sign in to bookmark strategies.");
      return;
    }

    const currentStrategy = strategies.find((item) => item._id === strategyId);
    if (!currentStrategy) return;

    const isBookmarked = Boolean(currentStrategy.isBookmarked);
    const updateStrategyBookmarkCount = (delta: 1 | -1) => {
      setStrategies((prev) =>
        prev.map((item) => {
          if (item._id !== strategyId) return item;

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

    setUpdatingStrategyIds((prev) => new Set(prev).add(strategyId));

    try {
      if (isBookmarked) {
        const response = await deleteBookmark({
          targetType: "strategy",
          targetId: strategyId,
        });

        setStrategies((prev) =>
          prev.map((item) =>
            item._id === strategyId ? { ...item, isBookmarked: false } : item,
          ),
        );
        updateStrategyBookmarkCount(-1);
        toast.success(response?.message || "Bookmark removed successfully.");
        return;
      }

      const response = await createBookmark({
        targetType: "strategy",
        target: strategyId,
      });

      setStrategies((prev) =>
        prev.map((item) =>
          item._id === strategyId ? { ...item, isBookmarked: true } : item,
        ),
      );
      updateStrategyBookmarkCount(1);
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
        setStrategies((prev) =>
          prev.map((item) =>
            item._id === strategyId ? { ...item, isBookmarked: false } : item,
          ),
        );
        updateStrategyBookmarkCount(-1);
        toast.success("Bookmark removed successfully.");
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update bookmark"));
    } finally {
      setUpdatingStrategyIds((prev) => {
        const next = new Set(prev);
        next.delete(strategyId);
        return next;
      });
    }
  };

  const onDeleteStrategy = async () => {
    if (!strategyIdPendingDelete) return;

    try {
      setIsDeletingStrategy(true);
      await deleteStrategy(strategyIdPendingDelete);

      setStrategies((prev) =>
        prev.filter((item) => item._id !== strategyIdPendingDelete),
      );
      setTotalCount((prev) => Math.max(0, prev - 1));
      toast.success("Strategy deleted successfully");
      setStrategyIdPendingDelete("");
    } catch (error: unknown) {
      const responseMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message
          : null;

      toast.error(
        responseMessage ??
          (error instanceof Error
            ? error.message
            : "Failed to delete strategy"),
      );
    } finally {
      setIsDeletingStrategy(false);
    }
  };

  const onCopyStrategyLink = async (strategyId: string) => {
    const strategyUrl = `${window.location.origin}/strategy/${strategyId}`;

    try {
      await navigator.clipboard.writeText(strategyUrl);
      toast.success("Link copied");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy link"));
    }
  };

  const onCloneStrategy = (strategy: StrategyItem) => {
    navigate("/strategy", {
      state: {
        openStrategyBuilder: true,
        duplicateStrategyId: strategy._id,
      },
    });
  };

  const getBacktestStrategyState = (strategy: StrategyItem) => ({
    strategy: {
      _id: strategy._id,
      name: strategy.name,
      description: strategy.description,
      isPublic: strategy.isPublic,
      accessType: strategy.access?.accessType ?? strategy.accessType ?? "free",
      access: strategy.access,
      stats: strategy.stats,
      user: strategy.user
        ? {
            _id: strategy.user._id,
            username: strategy.user.username,
            avatar: strategy.user.avatar,
            membership: strategy.user.membership,
          }
        : undefined,
    },
    strategyId: strategy._id,
    strategyName: strategy.name,
  });

  const openCreateSheet = () => {
    setSheetStrategyId("");
    setDuplicateSheetStrategyId("");
    setIsCreateSheetOpen(true);
  };

  const openEditSheet = (strategyId: string) => {
    setSheetStrategyId(strategyId);
    setDuplicateSheetStrategyId("");
    setIsCreateSheetOpen(true);
  };

  const closeCreateSheet = () => {
    setIsCreateSheetOpen(false);
    setSheetStrategyId("");
    setDuplicateSheetStrategyId("");
    setCreateSheetControls(null);

    if (shouldOpenStrategyBuilder) {
      navigate(location.pathname, { replace: true });
    }
  };

  const isEditingInSheet = Boolean(sheetStrategyId);

  useEffect(() => {
    if (isCreateSheetOpen) return;

    createSheetDragPointerIdRef.current = null;
    createSheetDragSourceRef.current = null;
    setIsCreateSheetDragging(false);
    setCreateSheetDragOffset(0);
  }, [isCreateSheetOpen]);

  const beginCreateSheetDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    source: "header" | "body",
  ) => {
    if (!isMobile || event.pointerType === "mouse") return;
    if (source === "body" && (createSheetBodyRef.current?.scrollTop ?? 0) > 0) {
      return;
    }

    createSheetDragPointerIdRef.current = event.pointerId;
    createSheetDragStartYRef.current = event.clientY;
    createSheetDragLastYRef.current = event.clientY;
    createSheetDragSourceRef.current = source;
    setIsCreateSheetDragging(false);
    setCreateSheetDragOffset(0);
  };

  const onCreateSheetPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isMobile || createSheetDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - createSheetDragStartYRef.current;

    if (deltaY <= 0) {
      if (isCreateSheetDragging || createSheetDragOffset > 0) {
        setIsCreateSheetDragging(false);
        setCreateSheetDragOffset(0);
      }
      return;
    }

    if (
      createSheetDragSourceRef.current === "body" &&
      (createSheetBodyRef.current?.scrollTop ?? 0) > 0
    ) {
      createSheetDragPointerIdRef.current = null;
      createSheetDragSourceRef.current = null;
      setIsCreateSheetDragging(false);
      setCreateSheetDragOffset(0);
      return;
    }

    createSheetDragLastYRef.current = event.clientY;
    setIsCreateSheetDragging(true);
    setCreateSheetDragOffset(deltaY);
    event.preventDefault();
  };

  const endCreateSheetDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (
      event &&
      createSheetDragPointerIdRef.current !== null &&
      createSheetDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const totalDrag = Math.max(
      0,
      createSheetDragLastYRef.current - createSheetDragStartYRef.current,
    );

    createSheetDragPointerIdRef.current = null;
    createSheetDragSourceRef.current = null;
    setIsCreateSheetDragging(false);

    if (totalDrag > 120) {
      closeCreateSheet();
      return;
    }

    setCreateSheetDragOffset(0);
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden md:space-y-6">
      <Card className="min-w-0 border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                Strategy Hub
              </span>
              <CardTitle>Strategy Library</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 text-sm leading-6">
                Discover strategies by name or creator.
                <span className="hidden items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground md:inline-flex">
                  {totalCount} strategies
                </span>
              </CardDescription>
              <div className="pt-1 md:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {totalCount} strategies
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="space-y-3">
              <Tabs
                value={category === "mine" ? "mine" : "all"}
                onValueChange={(value) => {
                  setCategory(value as StrategyCategory);
                  setPage(1);
                }}
              >
                <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
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
                      value="mine"
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

                  <div className="flex w-full min-w-0 flex-col gap-2 md:max-w-[420px] md:flex-1 md:flex-row">
                    <div className="relative min-w-0 flex-1">
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
                            <DropdownMenuLabel>Type</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={typeFilter}
                              onValueChange={(value) => {
                                setTypeFilter(value as StrategyFilterType);
                                setPage(1);
                              }}
                            >
                              <DropdownMenuRadioItem value="all">
                                All
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="free">
                                Free
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="paid">
                                Paid
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={sortBy}
                              onValueChange={(value) => {
                                const nextSortBy = value as StrategySortBy;
                                setSortBy(nextSortBy);
                                if (nextSortBy === "popular") {
                                  setOrder("desc");
                                }
                                if (nextSortBy === "name") {
                                  setOrder("asc");
                                }
                                if (
                                  nextSortBy === "createdAt" ||
                                  nextSortBy === "updatedAt"
                                ) {
                                  setOrder("desc");
                                }
                                setPage(1);
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

                    <Button
                      type="button"
                      className="md:w-auto"
                      onClick={openCreateSheet}
                    >
                      <Plus className="size-4" />
                      New strategy
                    </Button>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {listStatus ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            {listStatus === "searching" ? (
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
        ) : strategies.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No strategies matched your search."
              : category === "mine"
                ? "No strategies yet. Create your first one to start building your library."
                : "No strategies found."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {strategies.map((item) => {
              const isMine = Boolean(user?._id) && item.user?._id === user?._id;
              const isBookmarked = Boolean(item.isBookmarked);
              const description = item.description?.trim() || "No description";
              const accessType = item.access?.accessType ?? item.accessType;
              const isLockedPublicPaidFromOtherUser =
                !isMine && item.isPublic !== false && accessType === "paid";

              return (
                <Card
                  key={item._id}
                  className="min-w-0 cursor-pointer overflow-hidden border-border/70 py-0 transition-colors hover:bg-muted/60"
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

                    navigate(`/strategy/${item._id}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;

                    event.preventDefault();
                    navigate(`/strategy/${item._id}`);
                  }}
                >
                  <CardContent className="flex h-full flex-col gap-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar
                            size="sm"
                            className={getUserAvatarRingClass(
                              item.user?.membership,
                            )}
                          >
                            <AvatarImage
                              src={item.user?.avatar}
                              alt={item.user?.username || "Creator"}
                            />
                            <AvatarFallback>
                              {(
                                item.user?.username?.trim()?.[0] || "U"
                              ).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
                            {item.name}
                          </h3>
                        </div>
                        <div className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                          <span className="truncate">
                            @{item.user?.username || "unknown"}
                          </span>
                          <UserMembershipMark
                            membership={item.user?.membership}
                            className="size-3"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5",
                              (item.access?.accessType ?? item.accessType) ===
                                "paid" && "text-primary",
                            )}
                          >
                            {(item.access?.accessType ?? item.accessType) ===
                            "paid" ? (
                              <BadgeDollarSign className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <HandCoins className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {(item.access?.accessType ?? item.accessType) ===
                            "paid"
                              ? "Paid"
                              : "Free"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                            {item.isPublic !== false ? (
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {isMine
                              ? "Mine"
                              : item.isPublic !== false
                                ? "Public"
                                : "Private"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.stats?.viewCount ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                            <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.stats?.bookmarkCount ?? 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-start gap-2">
                        <span className="sr-only">Actions</span>
                        <ButtonGroup className="shrink-0">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="rounded-r-none border-transparent text-muted-foreground shadow-none"
                            aria-label={
                              isBookmarked ? "Bookmarked" : "Bookmark"
                            }
                            title={isBookmarked ? "Bookmarked" : "Bookmark"}
                            disabled={updatingStrategyIds.has(item._id)}
                            onClick={() => {
                              void onToggleBookmark(item._id);
                            }}
                          >
                            {updatingStrategyIds.has(item._id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isBookmarked ? (
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
                                variant="ghost"
                                className="-ml-px rounded-l-none border-transparent text-muted-foreground shadow-none"
                                aria-label="More actions"
                                title="More actions"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
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
                                  void onCopyStrategyLink(item._id);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                Copy link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isLockedPublicPaidFromOtherUser}
                                onSelect={() => {
                                  if (isLockedPublicPaidFromOtherUser) return;

                                  navigate("/backtest", {
                                    state: getBacktestStrategyState(item),
                                  });
                                }}
                              >
                                <CandlestickChart className="h-4 w-4" />
                                Backtest
                                {isLockedPublicPaidFromOtherUser ? (
                                  <Lock className="ml-auto h-3.5 w-3.5" />
                                ) : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  void onToggleBookmark(item._id);
                                }}
                                disabled={updatingStrategyIds.has(item._id)}
                              >
                                {isBookmarked ? (
                                  <BookmarkCheck className="h-4 w-4" />
                                ) : (
                                  <Bookmark className="h-4 w-4" />
                                )}
                                {isBookmarked ? "Bookmarked" : "Bookmark"}
                              </DropdownMenuItem>
                              {isMine ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      openEditSheet(item._id);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => {
                                      setStrategyIdPendingDelete(item._id);
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
                                    disabled={isLockedPublicPaidFromOtherUser}
                                    onSelect={() => {
                                      if (isLockedPublicPaidFromOtherUser) {
                                        return;
                                      }

                                      onCloneStrategy(item);
                                    }}
                                  >
                                    <CopyPlus className="h-4 w-4" />
                                    Clone
                                    {isLockedPublicPaidFromOtherUser ? (
                                      <Lock className="ml-auto h-3.5 w-3.5" />
                                    ) : null}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </ButtonGroup>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      {isLockedPublicPaidFromOtherUser ? (
                        <p className="text-sm text-muted-foreground">
                          Description hidden -{" "}
                          <span className="font-medium text-primary">
                            unlock on paid plan
                          </span>
                        </p>
                      ) : (
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={description}
                        >
                          {description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {hasNextPage && (
          <div className="flex flex-col items-center pt-2">
            <div ref={loadMoreRef} className="h-1 w-full" />
            {isAppending && (
              <div className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={Boolean(strategyIdPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingStrategy) {
            setStrategyIdPendingDelete("");
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
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void onDeleteStrategy();
              }}
              disabled={isDeletingStrategy}
              className="relative !bg-destructive !text-white hover:!bg-destructive/90"
            >
              {isDeletingStrategy ? (
                <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
              ) : null}
              <span className={isDeletingStrategy ? "opacity-0" : undefined}>
                Delete
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={isCreateSheetOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsCreateSheetOpen(true);
            return;
          }

          closeCreateSheet();
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={!isMobile}
          className={
            isMobile
              ? "gap-0 h-auto max-h-[82vh] w-full rounded-t-2xl p-0"
              : "gap-0 p-0 data-[side=right]:w-full md:data-[side=right]:max-w-2xl"
          }
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
          onPointerMove={onCreateSheetPointerMove}
          onPointerUp={endCreateSheetDrag}
          onPointerCancel={endCreateSheetDrag}
          style={
            isMobile
              ? {
                  transform: `translateY(${createSheetDragOffset}px)`,
                  transition: isCreateSheetDragging
                    ? "none"
                    : "transform 200ms ease-out",
                }
              : undefined
          }
        >
          <SheetHeader
            className={
              isMobile ? "border-b px-4 py-4 touch-none" : "border-b px-6 py-5"
            }
            onPointerDown={
              isMobile
                ? (event) => beginCreateSheetDrag(event, "header")
                : undefined
            }
          >
            {isMobile ? (
              <div className="-mt-1 mb-3 flex justify-center">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
              </div>
            ) : null}
            <SheetTitle>
              {isEditingInSheet
                ? "Edit Strategy"
                : duplicateSheetStrategyId
                  ? "Clone Strategy"
                  : "Create Strategy"}
            </SheetTitle>
            <SheetDescription>
              {isEditingInSheet
                ? "Edit your strategy."
                : duplicateSheetStrategyId
                  ? "Clone, edit, and save as your own."
                  : "Build a new strategy."}
            </SheetDescription>
          </SheetHeader>

          <div
            ref={createSheetBodyRef}
            className="flex-1 overflow-y-auto"
            onPointerDown={(event) => beginCreateSheetDrag(event, "body")}
            style={{ touchAction: isMobile ? "pan-y" : undefined }}
          >
            {isCreateSheetOpen ? (
              <StrategyBuilder
                embedded
                strategyId={sheetStrategyId}
                duplicateStrategyId={duplicateSheetStrategyId}
                onEmbeddedControlsChange={setCreateSheetControls}
                onRequestClose={closeCreateSheet}
                onSuccess={() => {
                  closeCreateSheet();
                  setPage(1);
                  setReloadKey((prev) => prev + 1);
                }}
              />
            ) : null}
          </div>

          <SheetFooter
            className={
              isMobile ? "border-t px-4 pt-3 pb-4" : "border-t px-6 pt-4 pb-6"
            }
          >
            <Button
              onClick={() => createSheetControls?.onSubmit()}
              disabled={createSheetControls?.submitDisabled ?? true}
              className="relative w-full md:w-auto"
            >
              {createSheetControls?.isSubmitting ? (
                <Loader2 className="absolute h-4 w-4 animate-spin" />
              ) : null}
              <span
                className={
                  createSheetControls?.isSubmitting ? "opacity-0" : undefined
                }
              >
                {createSheetControls?.submitLabel ?? "Create Strategy"}
              </span>
            </Button>
            {createSheetControls?.helperText ? (
              <p className="w-full text-xs text-muted-foreground">
                {createSheetControls.helperText}
              </p>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

type OperandMode = "candle" | "indicator" | "number";
type OperandField = "open" | "high" | "low" | "close" | "volume";
type LogicOperator =
  | ">"
  | "<"
  | ">="
  | "<="
  | "=="
  | "!="
  | "crossAbove"
  | "crossBelow";
type ParamType = "number" | "string" | "boolean";
type IndicatorSortField = "name" | "createdAt";
type SortOrder = "asc" | "desc";
type IndicatorCategory =
  | "trend"
  | "momentum"
  | "volatility"
  | "volume"
  | "support_resistance";

type IndicatorDefinition = {
  _id: string;
  name: string;
  description: string;
  category: IndicatorCategory;
  source?: OperandField;
  params?: Record<string, unknown>;
};

type IndicatorResponse = {
  result?: {
    indicators?: IndicatorDefinition[];
    hasNextPage?: boolean;
  };
};

type IndicatorQuery = {
  page?: number;
  search?: string;
  sortBy?: IndicatorSortField;
  order?: SortOrder;
  category?: IndicatorCategory;
};

type ParamDraft = {
  id: string;
  key: string;
  value: string;
  defaultValue: string;
  type: ParamType;
};

type IndicatorDraft = {
  id: string;
  indicator: string;
  indicatorName: string;
  indicatorDescription: string;
  key: string;
  source: OperandField;
  params: ParamDraft[];
};

type OperandDraft = {
  mode: OperandMode;
  value: string;
};

type DropdownOption<T extends string> = {
  label: string;
  value: T;
  group?: string;
  disabled?: boolean;
};

type ConditionRule = {
  id: string;
  type: "rule";
  left: OperandDraft;
  operator: LogicOperator;
  right: OperandDraft;
};

type ConditionGroup = {
  id: string;
  type: "group";
  logic: "and" | "or";
  conditions: ConditionNode[];
};

type ConditionNode = ConditionRule | ConditionGroup;

type StopLossDraft = {
  type: "candle" | "indicator" | "percent" | "atr";
  previousCandles: string;
  candleAggregation: "single" | "min" | "max" | "average";
  indicator: string;
  percentValue: string;
  atrPeriod: string;
  atrMultiplier: string;
};

type TakeProfitDraft = {
  type: "riskReward" | "percent" | "indicator";
  ratio: string;
  percentValue: string;
  indicator: string;
};

type LogicBlockDraft = {
  logic: "and" | "or";
  conditions: ConditionNode[];
  riskManagement: {
    stopLoss: StopLossDraft;
    takeProfit: TakeProfitDraft;
  };
};

type StrategyDetailItem = {
  _id: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  accessType?: StrategyAccessType;
  access?: StrategyAccessState;
  indicators?: Array<{
    key?: string;
    source?: OperandField;
    params?: Record<string, unknown>;
    indicator?: {
      _id?: string;
      name?: string;
      description?: string;
      category?: IndicatorCategory;
    };
  }>;
  entry?: {
    buy?: StrategyLogicBlock;
    sell?: StrategyLogicBlock;
  };
};

type StrategyDetailResponse = {
  result?: {
    strategy?: StrategyDetailItem;
  };
};

const EMPTY_INDICATOR_OPTION_VALUE = "__no_indicator_added__";

const sourceOptions: OperandField[] = [
  "open",
  "high",
  "low",
  "close",
  "volume",
];
const operatorOptions: LogicOperator[] = [
  ">",
  "<",
  ">=",
  "<=",
  "==",
  "!=",
  "crossAbove",
  "crossBelow",
];

const indicatorCategoryOptions: Array<{
  label: string;
  value: IndicatorCategory | "all";
}> = [
  { label: "All", value: "all" },
  { label: "Momentum", value: "momentum" },
  { label: "SNR", value: "support_resistance" },
  { label: "Trend", value: "trend" },
  { label: "Volatility", value: "volatility" },
  { label: "Volume", value: "volume" },
];

const indicatorSortOptions: Array<{
  label: string;
  value: IndicatorSortField;
}> = [
  { label: "Newest", value: "createdAt" },
  { label: "Name", value: "name" },
];

const indicatorResponseCache = new Map<string, IndicatorResponse>();
const indicatorResponseInFlight = new Map<string, Promise<IndicatorResponse>>();

function buildIndicatorQueryKey(query: IndicatorQuery) {
  return JSON.stringify({
    page: query.page ?? 1,
    search: query.search?.trim() ?? "",
    sortBy: query.sortBy ?? "name",
    order: query.order ?? "asc",
    category: query.category ?? "",
  });
}

async function fetchIndicatorsOnce(query: IndicatorQuery) {
  const cacheKey = buildIndicatorQueryKey(query);
  const cached = indicatorResponseCache.get(cacheKey);
  if (cached) return cached;

  const pending = indicatorResponseInFlight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const response = (await fetchIndicators(query)) as IndicatorResponse;
    indicatorResponseCache.set(cacheKey, response);
    return response;
  })();

  indicatorResponseInFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    indicatorResponseInFlight.delete(cacheKey);
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferParamType(value: unknown): ParamType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function shouldHideIndicatorParam(indicatorName: string, paramKey: string) {
  const normalizedIndicatorName = indicatorName.trim().toLowerCase();
  const normalizedParamKey = paramKey.trim().toLowerCase();

  return (
    normalizedIndicatorName === "macd" &&
    (normalizedParamKey === "simplemaoscillator" ||
      normalizedParamKey === "simplemasignal")
  );
}

function createParamDrafts(
  params?: Record<string, unknown>,
  indicatorName = "",
): ParamDraft[] {
  if (!params) return [];

  return Object.entries(params)
    .filter(([key]) => !shouldHideIndicatorParam(indicatorName, key))
    .map(([key, value]) => ({
      id: createId(),
      key,
      value: String(value),
      defaultValue: String(value),
      type: inferParamType(value),
    }));
}

function buildIndicatorKey(name: string, params: ParamDraft[]) {
  const base = name.trim().toLowerCase().replace(/\s+/g, "_");
  const suffix = params
    .filter((param) => {
      const key = param.key.trim().toLowerCase();
      return key !== "simplemaoscillator" && key !== "simplemasignal";
    })
    .map((param) => String(param.value).trim())
    .filter(Boolean)
    .join("_");

  return suffix ? `${base}_${suffix}` : base;
}

function buildUniqueIndicatorKey(
  name: string,
  params: ParamDraft[],
  drafts: IndicatorDraft[],
  excludeId?: string,
) {
  const base = buildIndicatorKey(name, params);
  const used = new Set(
    drafts
      .filter((item) => item.id !== excludeId)
      .map((item) => item.key.trim())
      .filter(Boolean),
  );

  if (!used.has(base)) return base;

  let counter = 2;
  while (used.has(`${base}_${counter}`)) {
    counter += 1;
  }

  return `${base}_${counter}`;
}

function getIndicatorOutputKeys(draft: IndicatorDraft): string[] {
  const indicatorKey = draft.key.trim();
  const indicatorName = draft.indicatorName.trim().toLowerCase();

  if (!indicatorKey) return [];

  switch (indicatorName) {
    case "bb":
    case "bollingerbands":
      return [
        `${indicatorKey}.middle`,
        `${indicatorKey}.upper`,
        `${indicatorKey}.lower`,
        `${indicatorKey}.pb`,
      ];
    case "macd":
      return [
        `${indicatorKey}.MACD`,
        `${indicatorKey}.signal`,
        `${indicatorKey}.histogram`,
      ];
    case "stochastic":
      return [`${indicatorKey}.k`, `${indicatorKey}.d`];
    case "adx":
      return [
        `${indicatorKey}.adx`,
        `${indicatorKey}.pdi`,
        `${indicatorKey}.mdi`,
      ];
    default:
      return [indicatorKey];
  }
}

function buildIndicatorDropdownOptions(indicatorKeys: string[]) {
  if (indicatorKeys.length === 0) {
    return [
      {
        label: "Add indicators first",
        value: EMPTY_INDICATOR_OPTION_VALUE,
      },
    ];
  }

  return indicatorKeys.map((item) => ({
    label: item,
    value: item,
  }));
}

function getFirstIndicatorKey(indicatorKeys: string[]) {
  return indicatorKeys[0] ?? "";
}

function collectUsedIndicatorKeysFromCondition(
  node: ConditionNode,
  usedKeys: Set<string>,
) {
  if (node.type === "group") {
    node.conditions.forEach((condition) =>
      collectUsedIndicatorKeysFromCondition(condition, usedKeys),
    );
    return;
  }

  if (node.left.mode === "indicator" && node.left.value.trim()) {
    usedKeys.add(node.left.value.trim());
  }

  if (node.right.mode === "indicator" && node.right.value.trim()) {
    usedKeys.add(node.right.value.trim());
  }
}

function extractUsedIndicatorKeysFromBlock(block: LogicBlockDraft) {
  const usedKeys = new Set<string>();

  block.conditions.forEach((condition) =>
    collectUsedIndicatorKeysFromCondition(condition, usedKeys),
  );

  if (
    block.riskManagement.stopLoss.type === "indicator" &&
    block.riskManagement.stopLoss.indicator.trim()
  ) {
    usedKeys.add(block.riskManagement.stopLoss.indicator.trim());
  }

  if (
    block.riskManagement.stopLoss.type === "atr" &&
    block.riskManagement.stopLoss.atrPeriod.trim()
  ) {
    usedKeys.add(`atr_${block.riskManagement.stopLoss.atrPeriod.trim()}`);
  }

  if (
    block.riskManagement.takeProfit.type === "indicator" &&
    block.riskManagement.takeProfit.indicator.trim()
  ) {
    usedKeys.add(block.riskManagement.takeProfit.indicator.trim());
  }

  return usedKeys;
}

function isIndicatorDraftUsed(draft: IndicatorDraft, usedKeys: Set<string>) {
  const indicatorKey = draft.key.trim();

  if (!indicatorKey) return false;

  return [...usedKeys].some(
    (usedKey) =>
      usedKey === indicatorKey || usedKey.startsWith(`${indicatorKey}.`),
  );
}

function getParamHelpText(paramKey: string) {
  switch (paramKey) {
    default:
      return "";
  }
}

const STRATEGY_NAME_MAX_LENGTH = 50;
const STRATEGY_DESCRIPTION_MAX_LENGTH = 200;

function getStrategyNameError(name: string) {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) return "";
  if (trimmedName.length < 2) return "Min 2 characters";
  if (trimmedName.length > STRATEGY_NAME_MAX_LENGTH) {
    return `Max ${STRATEGY_NAME_MAX_LENGTH} characters`;
  }

  return "";
}

function ParamHelpTooltip({
  label: _label,
  content: _content,
}: {
  label: string;
  content: string;
}) {
  void _label;
  void _content;
  return null;
}

function AdaptiveTooltipIcon({
  label: _label,
  content: _content,
  className: _className,
}: {
  label: string;
  content: ReactNode;
  className?: string;
}) {
  void _label;
  void _content;
  void _className;
  return null;
}

function createOperandDraft(
  mode: OperandMode = "candle",
  value = "close",
): OperandDraft {
  return { mode, value };
}

function createConditionRule(): ConditionRule {
  return {
    id: createId(),
    type: "rule",
    left: createOperandDraft("candle", "close"),
    operator: ">",
    right: createOperandDraft("candle", "open"),
  };
}

function createConditionGroup(): ConditionGroup {
  return {
    id: createId(),
    type: "group",
    logic: "and",
    conditions: [createConditionRule()],
  };
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
  };
}

function createTakeProfitDraft(): TakeProfitDraft {
  return {
    type: "riskReward",
    ratio: "2",
    percentValue: "2",
    indicator: "",
  };
}

function createLogicBlockDraft(): LogicBlockDraft {
  return {
    logic: "and",
    conditions: [createConditionRule()],
    riskManagement: {
      stopLoss: createStopLossDraft(),
      takeProfit: createTakeProfitDraft(),
    },
  };
}

function removeConditionTree(
  nodes: ConditionNode[],
  targetId: string,
): ConditionNode[] {
  return nodes
    .filter((node) => node.id !== targetId)
    .map((node) => {
      if (node.type === "group") {
        return {
          ...node,
          conditions: removeConditionTree(node.conditions, targetId),
        };
      }

      return node;
    });
}

function parseOperand(operand: OperandDraft, label: string) {
  if (!operand.value.trim()) {
    throw new Error(`${label} is required`);
  }

  if (operand.mode === "number") {
    const numeric = Number(operand.value);
    if (Number.isNaN(numeric)) {
      throw new Error(`${label} must be a valid number`);
    }

    return numeric;
  }

  return operand.value.trim();
}

function serializeConditionNode(node: ConditionNode): StrategyCondition {
  if (node.type === "group") {
    if (node.conditions.length === 0) {
      throw new Error("Condition groups must contain at least one condition");
    }

    return {
      logic: node.logic,
      conditions: node.conditions.map(serializeConditionNode),
    };
  }

  return {
    left: parseOperand(node.left, "Condition left side"),
    operator: node.operator,
    right: parseOperand(node.right, "Condition right side"),
  };
}

function serializeStopLoss(stopLoss: StopLossDraft) {
  switch (stopLoss.type) {
    case "candle": {
      if (!stopLoss.previousCandles.trim()) {
        throw new Error("Stop loss previous candles is required");
      }

      const previousCandles = Number(stopLoss.previousCandles);
      if (!Number.isInteger(previousCandles) || previousCandles < 0) {
        throw new Error("Stop loss previous candles must be 0 or more");
      }

      return {
        type: "candle",
        previousCandles,
        aggregation: stopLoss.candleAggregation,
      };
    }
    case "indicator":
      if (!stopLoss.indicator.trim()) {
        throw new Error("Stop loss indicator key is required");
      }
      return {
        type: "indicator",
        indicator: stopLoss.indicator.trim(),
      };
    case "percent": {
      const value = Number(stopLoss.percentValue);
      if (Number.isNaN(value) || value <= 0) {
        throw new Error("Stop loss percent must be greater than 0");
      }
      return {
        type: "percent",
        value,
      };
    }
    case "atr": {
      const period = Number(stopLoss.atrPeriod);
      const multiplier = Number(stopLoss.atrMultiplier);
      if (!Number.isInteger(period) || period <= 0) {
        throw new Error("ATR period must be a positive integer");
      }
      if (Number.isNaN(multiplier) || multiplier <= 0) {
        throw new Error("ATR multiplier must be greater than 0");
      }
      return {
        type: "atr",
        period,
        multiplier,
      };
    }
  }
}

function serializeTakeProfit(takeProfit: TakeProfitDraft) {
  switch (takeProfit.type) {
    case "riskReward": {
      const ratio = Number(takeProfit.ratio);
      if (Number.isNaN(ratio) || ratio <= 0) {
        throw new Error("Take profit ratio must be greater than 0");
      }
      return {
        type: "riskReward",
        ratio,
      };
    }
    case "percent": {
      const value = Number(takeProfit.percentValue);
      if (Number.isNaN(value) || value <= 0) {
        throw new Error("Take profit percent must be greater than 0");
      }
      return {
        type: "percent",
        value,
      };
    }
    case "indicator":
      if (!takeProfit.indicator.trim()) {
        throw new Error("Take profit indicator key is required");
      }
      return {
        type: "indicator",
        indicator: takeProfit.indicator.trim(),
      };
  }
}

function serializeLogicBlock(
  block: LogicBlockDraft,
  sideLabel?: "Buy" | "Sell",
): StrategyLogicBlock {
  if (block.conditions.length === 0) {
    throw new Error(
      sideLabel
        ? `Add at least one ${sideLabel} rule`
        : "Add at least one rule",
    );
  }

  return {
    logic: block.logic,
    conditions: block.conditions.map(serializeConditionNode),
    riskManagement: {
      stopLoss: serializeStopLoss(block.riskManagement.stopLoss),
      takeProfit: serializeTakeProfit(block.riskManagement.takeProfit),
    },
  };
}

function deserializeOperand(value: unknown): OperandDraft {
  if (typeof value === "number") {
    return createOperandDraft("number", String(value));
  }

  if (typeof value === "string") {
    if (sourceOptions.includes(value as OperandField)) {
      return createOperandDraft("candle", value);
    }

    return createOperandDraft("indicator", value);
  }

  return createOperandDraft("indicator", String(value ?? ""));
}

function deserializeConditionNode(node: StrategyCondition): ConditionNode {
  if ("conditions" in node) {
    return {
      id: createId(),
      type: "group",
      logic: node.logic,
      conditions: node.conditions.map(deserializeConditionNode),
    };
  }

  return {
    id: createId(),
    type: "rule",
    left: deserializeOperand(node.left),
    operator: node.operator,
    right: deserializeOperand(node.right),
  };
}

function deserializeStopLoss(
  stopLoss?: Record<string, unknown>,
): StopLossDraft {
  const fallback = createStopLossDraft();

  if (!stopLoss?.type || typeof stopLoss.type !== "string") {
    return fallback;
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
      };
    case "indicator":
      return {
        ...fallback,
        type: "indicator",
        indicator: String(stopLoss.indicator ?? ""),
      };
    case "percent":
      return {
        ...fallback,
        type: "percent",
        percentValue: String(stopLoss.value ?? fallback.percentValue),
      };
    case "atr":
      return {
        ...fallback,
        type: "atr",
        atrPeriod: String(stopLoss.period ?? fallback.atrPeriod),
        atrMultiplier: String(stopLoss.multiplier ?? fallback.atrMultiplier),
      };
    default:
      return fallback;
  }
}

function deserializeTakeProfit(
  takeProfit?: Record<string, unknown>,
): TakeProfitDraft {
  const fallback = createTakeProfitDraft();

  if (!takeProfit?.type || typeof takeProfit.type !== "string") {
    return fallback;
  }

  switch (takeProfit.type) {
    case "riskReward":
      return {
        ...fallback,
        type: "riskReward",
        ratio: String(takeProfit.ratio ?? fallback.ratio),
      };
    case "percent":
      return {
        ...fallback,
        type: "percent",
        percentValue: String(takeProfit.value ?? fallback.percentValue),
      };
    case "indicator":
      return {
        ...fallback,
        type: "indicator",
        indicator: String(takeProfit.indicator ?? ""),
      };
    default:
      return fallback;
  }
}

function deserializeLogicBlock(block?: StrategyLogicBlock): LogicBlockDraft {
  const fallback = createLogicBlockDraft();

  if (!block) {
    return fallback;
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
  };
}

function DropdownField<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  compact = false,
  disabled = false,
}: {
  value: T | "";
  onChange: (next: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const selectedOption = options.find((option) => option.value === value);
  const groupedOptions = options.reduce<
    Array<{ group?: string; options: DropdownOption<T>[] }>
  >((groups, option) => {
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.group === option.group) {
      lastGroup.options.push(option);
      return groups;
    }

    groups.push({ group: option.group, options: [option] });
    return groups;
  }, []);
  const shouldScroll = options.length > 7;
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

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
              className="min-w-0 pl-2.5"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </div>
      ))}
    </DropdownMenuRadioGroup>
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            compact && "h-8 px-2.5",
            !selectedOption && "text-muted-foreground",
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
        className="w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden bg-popover p-0"
      >
        {shouldScroll ? (
          <ScrollArea
            ref={scrollAreaRef}
            className="h-44"
            onWheelCapture={(event) => {
              const viewport =
                scrollAreaRef.current?.querySelector<HTMLElement>(
                  '[data-slot="scroll-area-viewport"]',
                );

              if (!viewport) {
                return;
              }

              const canScroll =
                viewport.scrollHeight > viewport.clientHeight &&
                event.deltaY !== 0;

              if (!canScroll) {
                return;
              }

              event.preventDefault();
              viewport.scrollTop += event.deltaY;
            }}
          >
            {dropdownItems}
          </ScrollArea>
        ) : (
          dropdownItems
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function countConditionNodes(nodes: ConditionNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === "group") {
      return count + countConditionNodes(node.conditions);
    }

    return count + 1;
  }, 0);
}

function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const [head, ...tail] = normalized.split(".");

  if (tail.length === 0) return normalized;

  return `${head}.${tail.join("")}`;
}

function sanitizeIntegerInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  if (!digitsOnly) return "";

  return digitsOnly.replace(/^0+(?=\d)/, "");
}

function fallbackInputValue(value: string, defaultValue: string) {
  return value.trim() ? value : defaultValue;
}

function summarizeRuleCount(count: number) {
  if (count <= 0) return "No rules";
  if (count === 1) return "1 rule";
  return `${count} rules`;
}

function formatDraftOperand(operand: OperandDraft) {
  const value = operand.value.trim();

  if (!value) {
    return operand.mode === "number" ? "0" : "value";
  }

  return value;
}

function summarizeStopLossDraft(
  stopLoss: StopLossDraft,
  side: "buy" | "sell",
) {
  switch (stopLoss.type) {
    case "candle": {
      const previousCandles = Number(stopLoss.previousCandles || "0");
      const priceField = side === "buy" ? "low" : "high";
      const candleLabel =
        previousCandles === 0
          ? "Current candle"
          : `Previous ${previousCandles} candle${previousCandles === 1 ? "" : "s"}`;

      return `${candleLabel} (${stopLoss.candleAggregation}, ${priceField})`;
    }
    case "indicator":
      return stopLoss.indicator.trim()
        ? `Indicator ${stopLoss.indicator.trim()}`
        : "Indicator not selected";
    case "percent":
      return `${stopLoss.percentValue || "0"}%`;
    case "atr":
      return `ATR ${stopLoss.atrPeriod || "0"} x ${stopLoss.atrMultiplier || "0"}`;
  }
}

function summarizeTakeProfitDraft(takeProfit: TakeProfitDraft) {
  switch (takeProfit.type) {
    case "riskReward":
      return `${takeProfit.ratio || "0"}R`;
    case "percent":
      return `${takeProfit.percentValue || "0"}%`;
    case "indicator":
      return takeProfit.indicator.trim()
        ? `Indicator ${takeProfit.indicator.trim()}`
        : "Indicator not selected";
  }
}

function DraftLogicWord({ logic }: { logic: "and" | "or" }) {
  return (
    <span
      className={cn(
        "mx-1 inline-flex text-[10px] font-semibold uppercase",
      )}
    >
      {logic}
    </span>
  );
}

function DraftRuleToken({
  node,
  tone,
}: {
  node: ConditionRule;
  tone: "buy" | "sell";
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center rounded-2xl px-2 py-1 text-xs leading-5 font-medium",
        tone === "buy" ? "bg-success/18" : "bg-destructive/16",
      )}
    >
      <span className="break-all">{formatDraftOperand(node.left)}</span>
      <span
        className={cn(
          "mx-1 inline-flex min-w-[1.25rem] items-center justify-center px-1 py-0.5 text-center text-[10px] leading-none font-semibold",
          tone === "buy" ? "text-success" : "text-destructive",
        )}
      >
        {node.operator}
      </span>
      <span className="break-all">{formatDraftOperand(node.right)}</span>
    </span>
  );
}

function DraftRuleExpression({
  node,
  tone,
}: {
  node: ConditionNode;
  tone: "buy" | "sell";
}) {
  if (node.type === "group") {
    return (
      <span
        className={cn(
          "inline-flex flex-wrap items-center rounded-2xl border px-2 py-1",
          tone === "buy" ? "border-success/18" : "border-destructive/16",
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
    );
  }

  return <DraftRuleToken node={node} tone={tone} />;
}

function formatDraftConditionNodeSummary(node: ConditionNode): string {
  if (node.type === "group") {
    const nested = node.conditions
      .map((child) => formatDraftConditionNodeSummary(child))
      .filter(Boolean)
      .join(` ${node.logic} `);

    return nested ? `(${nested})` : "";
  }

  return `${formatDraftOperand(node.left)} ${node.operator} ${formatDraftOperand(node.right)}`;
}

function DraftRuleSequence({
  nodes,
  logic,
  tone,
}: {
  nodes: ConditionNode[];
  logic: "and" | "or";
  tone: "buy" | "sell";
}) {
  return (
    <div className="text-left leading-9">
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
  );
}

function DraftRiskTile({
  label,
  value,
  editContent,
}: {
  label: string;
  value: string;
  editContent?: ReactNode;
}) {
  const isStopLoss = label === "Stop Loss";

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border px-3 py-3",
        isStopLoss
          ? "border-destructive/15 bg-destructive/5"
          : "border-success/15 bg-success/5",
      )}
    >
      <p className="shrink-0 pt-0.5 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="min-w-0 flex flex-1 items-start justify-end gap-3">
        <p
          className={cn(
            "text-right text-sm leading-5 font-medium break-words [overflow-wrap:anywhere]",
            isStopLoss ? "text-destructive" : "text-success",
          )}
        >
          {value}
        </p>
        {editContent ? <div className="shrink-0">{editContent}</div> : null}
      </div>
    </div>
  );
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
          <div className="space-y-1">
            <p>
              <span className="font-medium text-foreground">and</span> - when
              every rule must match.
            </p>
            <p>
              <span className="font-medium text-foreground">or</span> - when any
              one rule can match.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function LogicToggle({
  value,
  onChange,
}: {
  value: "and" | "or";
  onChange: (next: "and" | "or") => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue === "and" || nextValue === "or") {
          onChange(nextValue);
        }
      }}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value="and" variant="outline" size="sm">
        AND
      </ToggleGroupItem>
      <ToggleGroupItem value="or" variant="outline" size="sm">
        OR
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function HelpLabel({
  children,
  content,
}: {
  children: string;
  content: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{children}</Label>
      <AdaptiveTooltipIcon
        label={children}
        content={<div className="space-y-2 text-xs">{content}</div>}
      />
    </div>
  );
}

function OperandEditor({
  label,
  value,
  onChange,
  candleOptions,
  indicatorFieldOptions,
}: {
  label: string;
  value: OperandDraft;
  onChange: (next: OperandDraft) => void;
  candleOptions: DropdownOption<string>[];
  indicatorFieldOptions: DropdownOption<string>[];
}) {
  const hasIndicatorOptions =
    indicatorFieldOptions[0]?.value !== EMPTY_INDICATOR_OPTION_VALUE;

  return (
    <div className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 md:block md:space-y-2">
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

      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 md:block md:space-y-2">
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
            placeholder="Add indicators first"
            disabled={!hasIndicatorOptions}
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
  );
}

function ConditionEditor({
  node,
  title,
  candleOptions,
  indicatorFieldOptions,
  canAddMoreRules,
  ruleLimitMessage,
  onChange,
  onRemove,
}: {
  node: ConditionNode;
  title: string;
  candleOptions: DropdownOption<string>[];
  indicatorFieldOptions: DropdownOption<string>[];
  canAddMoreRules: boolean;
  ruleLimitMessage: string;
  onChange: (next: ConditionNode) => void;
  onRemove: () => void;
}) {
  if (node.type === "group") {
    return (
      <div className="relative space-y-3 rounded-xl border border-dashed p-4">
        <div className="pr-10">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">
              Set the logic for this group.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          className="absolute top-3 right-3"
          onClick={onRemove}
          aria-label="Remove group"
          title="Remove group"
        >
          <Trash2 className="size-4" />
        </Button>

        <div className="space-y-3">
          {node.conditions.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <LogicLabel>Group Logic</LogicLabel>
              <LogicToggle
                value={node.logic}
                onChange={(nextLogic) =>
                  onChange({
                    ...node,
                    logic: nextLogic,
                  })
                }
              />
            </div>
          )}

          {node.conditions.map((child, index) => (
            <div key={child.id} className="space-y-3">
              {index > 0 ? (
                <div className="flex justify-center">
                  <DraftLogicWord logic={node.logic} />
                </div>
              ) : null}
              <ConditionEditor
                node={child}
                title={`Rule ${index + 1}`}
                candleOptions={candleOptions}
                indicatorFieldOptions={indicatorFieldOptions}
                canAddMoreRules={canAddMoreRules}
                ruleLimitMessage={ruleLimitMessage}
                onChange={(next) =>
                  onChange({
                    ...node,
                    conditions: node.conditions.map((item) =>
                      item.id === child.id ? next : item,
                    ),
                  })
                }
                onRemove={() => {
                  if (node.conditions.length === 1) {
                    onRemove();
                    return;
                  }

                  onChange({
                    ...node,
                    conditions: removeConditionTree(node.conditions, child.id),
                  });
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canAddMoreRules}
            title={!canAddMoreRules ? ruleLimitMessage : "Add rule"}
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
            disabled={!canAddMoreRules}
            title={!canAddMoreRules ? ruleLimitMessage : "Add group"}
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
    );
  }

  return (
    <div className="relative space-y-3 rounded-xl border p-4">
      <div className="pr-10">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            Set the comparison for this rule.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        className="absolute top-3 right-3"
        onClick={onRemove}
        aria-label="Remove rule"
        title="Remove rule"
      >
        <Trash2 className="size-4" />
      </Button>

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

      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 md:block md:space-y-2">
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
  );
}

function StopLossEditor({
  side,
  draft,
  indicatorKeys,
  onChange,
}: {
  side: "buy" | "sell";
  draft: StopLossDraft;
  indicatorKeys: string[];
  onChange: (next: StopLossDraft) => void;
}) {
  const indicatorDropdownOptions = buildIndicatorDropdownOptions(indicatorKeys);
  const previousCandleCount = Number(draft.previousCandles || "0");
  const isCurrentCandleOnly =
    Number.isInteger(previousCandleCount) && previousCandleCount === 0;
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
  ];
  const candleSideLabel = side === "buy" ? "low" : "high";
  const candleSidePluralLabel = side === "buy" ? "lows" : "highs";
  const candleSourceLabel =
    previousCandleCount === 0
      ? `the current entry candle ${candleSideLabel}`
      : previousCandleCount === 1
        ? `the previous candle ${candleSideLabel}`
        : `the previous ${previousCandleCount} candle ${candleSidePluralLabel}`;
  const candleSelectionMessage =
    draft.candleAggregation === "single"
      ? `Using ${candleSourceLabel}.`
      : draft.candleAggregation === "min"
        ? `Using the minimum ${candleSideLabel} from ${candleSourceLabel}.`
        : draft.candleAggregation === "max"
          ? `Using the maximum ${candleSideLabel} from ${candleSourceLabel}.`
          : `Using the average ${candleSideLabel} from ${candleSourceLabel}.`;

  return (
    <div className="space-y-3">
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
              ? "Buy stop loss uses candle lows as the reference."
              : "Sell stop loss uses candle highs as the reference."}
          </p>
          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Price Reference
              </p>
              <p
                className={cn(
                  "text-sm font-medium",
                  side === "buy" ? "text-success" : "text-destructive",
                )}
              >
                {side === "buy" ? "Low" : "High"}
              </p>
            </div>
          </div>
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
                    event.target.value,
                  );
                  const nextCount = Number(nextPreviousCandles || "0");

                  onChange({
                    ...draft,
                    previousCandles: nextPreviousCandles,
                    candleAggregation:
                      Number.isInteger(nextCount) && nextCount === 0
                        ? "single"
                        : draft.candleAggregation,
                  });
                }}
                onBlur={() => {
                  if (draft.previousCandles !== "") return;

                  onChange({
                    ...draft,
                    previousCandles: "0",
                    candleAggregation: "single",
                  });
                }}
                placeholder="0"
              />
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
          <p className="text-xs text-muted-foreground">
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
            placeholder="Add indicators first"
            disabled={indicatorKeys.length === 0}
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
  );
}

function TakeProfitEditor({
  draft,
  indicatorKeys,
  onChange,
}: {
  draft: TakeProfitDraft;
  indicatorKeys: string[];
  onChange: (next: TakeProfitDraft) => void;
}) {
  const indicatorDropdownOptions = buildIndicatorDropdownOptions(indicatorKeys);

  return (
    <div className="space-y-3">
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
            placeholder="Add indicators first"
            disabled={indicatorKeys.length === 0}
            options={indicatorDropdownOptions}
          />
        </div>
      )}
    </div>
  );
}

function LogicBlockEditor({
  title,
  description,
  draft,
  candleOptions,
  indicatorFieldOptions,
  indicatorKeys,
  maxRules,
  ruleLimitMessage,
  upgradeCtaLabel,
  onChange,
}: {
  title: string;
  description: string;
  draft: LogicBlockDraft;
  candleOptions: DropdownOption<string>[];
  indicatorFieldOptions: DropdownOption<string>[];
  indicatorKeys: string[];
  maxRules: number;
  ruleLimitMessage: string;
  upgradeCtaLabel: string | null;
  onChange: (next: LogicBlockDraft) => void;
}) {
  const ruleCount = countConditionNodes(draft.conditions);
  const sideLabel = title.replace(/\s+Entry$/, "");
  const tone = sideLabel.toLowerCase() === "buy" ? "buy" : "sell";
  const isBuy = tone === "buy";
  const shouldScrollEntryEditor = draft.conditions.length > 1;
  const entrySummary = summarizeRuleCount(ruleCount);
  const canAddMoreRules = ruleCount < maxRules;
  const ruleUsageLabel = `${ruleCount}/${maxRules} rules`;

  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden border-border/70",
        isBuy ? "bg-success/5" : "bg-destructive/5",
      )}
    >
      <CardContent className="space-y-4 md:px-5">
        <div className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            {isBuy ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            {description}
          </CardDescription>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Rules
              </p>
              <span className="text-[11px] text-muted-foreground">
                {entrySummary}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {ruleUsageLabel}
              </span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Edit rules"
                  title="Edit rules"
                >
                  <Settings2 className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent
                onOpenAutoFocus={(event) => event.preventDefault()}
                className={cn(
                  "top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 md:top-[10vh] md:max-w-[560px]",
                  shouldScrollEntryEditor && "overflow-hidden p-0",
                  !shouldScrollEntryEditor && "p-0",
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
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <LogicLabel>Root Logic</LogicLabel>
                            <LogicToggle
                              value={draft.logic}
                              onChange={(nextLogic) =>
                                onChange({
                                  ...draft,
                                  logic: nextLogic,
                                })
                              }
                            />
                          </div>
                        )}

                        {draft.conditions.map((condition, index) => (
                          <div key={condition.id} className="space-y-3">
                            {index > 0 ? (
                              <div className="flex justify-center">
                                <DraftLogicWord logic={draft.logic} />
                              </div>
                            ) : null}
                            <ConditionEditor
                              node={condition}
                              title={`Rule ${index + 1}`}
                              candleOptions={candleOptions}
                              indicatorFieldOptions={indicatorFieldOptions}
                              canAddMoreRules={canAddMoreRules}
                              ruleLimitMessage={ruleLimitMessage}
                              onChange={(next) =>
                                onChange({
                                  ...draft,
                                  conditions: draft.conditions.map((item) =>
                                    item.id === condition.id ? next : item,
                                  ),
                                })
                              }
                              onRemove={() =>
                                onChange({
                                  ...draft,
                                  conditions: removeConditionTree(
                                    draft.conditions,
                                    condition.id,
                                  ),
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!canAddMoreRules}
                          title={!canAddMoreRules ? ruleLimitMessage : "Add rule"}
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
                          disabled={!canAddMoreRules}
                          title={!canAddMoreRules ? ruleLimitMessage : "Add group"}
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
                        {!canAddMoreRules && upgradeCtaLabel ? (
                          <Button type="button" asChild>
                            <Link to="/pricing">{upgradeCtaLabel}</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="space-y-4 p-4">
                    <div className="space-y-3">
                      {draft.conditions.length > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <LogicLabel>Root Logic</LogicLabel>
                          <LogicToggle
                            value={draft.logic}
                            onChange={(nextLogic) =>
                              onChange({
                                ...draft,
                                logic: nextLogic,
                              })
                            }
                          />
                        </div>
                      )}

                      {draft.conditions.map((condition, index) => (
                        <div key={condition.id} className="space-y-3">
                          {index > 0 ? (
                            <div className="flex justify-center">
                              <DraftLogicWord logic={draft.logic} />
                            </div>
                          ) : null}
                          <ConditionEditor
                            node={condition}
                            title={`Rule ${index + 1}`}
                            candleOptions={candleOptions}
                            indicatorFieldOptions={indicatorFieldOptions}
                            canAddMoreRules={canAddMoreRules}
                            ruleLimitMessage={ruleLimitMessage}
                            onChange={(next) =>
                              onChange({
                                ...draft,
                                conditions: draft.conditions.map((item) =>
                                  item.id === condition.id ? next : item,
                                ),
                              })
                            }
                            onRemove={() =>
                              onChange({
                                ...draft,
                                conditions: removeConditionTree(
                                  draft.conditions,
                                  condition.id,
                                ),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canAddMoreRules}
                        title={!canAddMoreRules ? ruleLimitMessage : "Add rule"}
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
                        disabled={!canAddMoreRules}
                        title={!canAddMoreRules ? ruleLimitMessage : "Add group"}
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
                      {!canAddMoreRules && upgradeCtaLabel ? (
                        <Button type="button" asChild>
                          <Link to="/pricing">{upgradeCtaLabel}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="text-left leading-9">
            <DraftRuleSequence
              nodes={draft.conditions}
              logic={draft.logic}
              tone={tone}
            />
          </div>
          {!canAddMoreRules ? (
            <p className="text-xs text-muted-foreground">{ruleLimitMessage}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Risk Setup
          </p>
        </div>

        <div className="space-y-2.5">
          <DraftRiskTile
            label="Stop Loss"
            value={summarizeStopLossDraft(draft.riskManagement.stopLoss, tone)}
            editContent={
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Edit stop loss"
                    title="Edit stop loss"
                  >
                    <Settings2 className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 md:top-[10vh] md:max-w-[420px]"
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
                    variant="outline"
                    size="icon-sm"
                    aria-label="Edit take profit"
                    title="Edit take profit"
                  >
                    <Settings2 className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 md:top-[10vh] md:max-w-[420px]"
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
      </CardContent>
    </Card>
  );
}

export type StrategyBuilderFooterControls = {
  submitLabel: string;
  submitDisabled: boolean;
  isSubmitting: boolean;
  isLoadingStrategy: boolean;
  helperText: string | null;
  onSubmit: () => void;
};

export type StrategyBuilderProps = {
  embedded?: boolean;
  strategyId?: string;
  duplicateStrategyId?: string;
  onSuccess?: (strategyId?: string) => void;
  onRequestClose?: () => void;
  onEmbeddedControlsChange?: (controls: StrategyBuilderFooterControls) => void;
};

export function StrategyBuilder({
  embedded = false,
  strategyId: strategyIdProp = "",
  duplicateStrategyId: duplicateStrategyIdProp = "",
  onSuccess,
  onRequestClose,
  onEmbeddedControlsChange,
}: StrategyBuilderProps = {}) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { strategyId: routeStrategyId = "" } = useParams();
  const strategyId = strategyIdProp || routeStrategyId;
  const isEditing = Boolean(strategyId);
  const duplicateStrategyId = duplicateStrategyIdProp;
  const isDuplicating = !isEditing && Boolean(duplicateStrategyId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [accessType, setAccessType] = useState<StrategyAccessType>("free");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [debouncedIndicatorSearch, setDebouncedIndicatorSearch] = useState("");
  const [indicatorCategory, setIndicatorCategory] = useState<
    IndicatorCategory | "all"
  >("all");
  const [indicatorSortBy, setIndicatorSortBy] =
    useState<IndicatorSortField>("name");
  const [indicatorOrder, setIndicatorOrder] = useState<SortOrder>("asc");
  const [isIndicatorMenuOpen, setIsIndicatorMenuOpen] = useState(false);
  const [indicatorPage, setIndicatorPage] = useState(1);
  const [indicatorHasNextPage, setIndicatorHasNextPage] = useState(false);
  const [isAppendingIndicators, setIsAppendingIndicators] = useState(false);
  const [indicatorOptions, setIndicatorOptions] = useState<
    IndicatorDefinition[]
  >([]);
  const [isSearchingIndicators, setIsSearchingIndicators] = useState(false);
  const [indicatorDrafts, setIndicatorDrafts] = useState<IndicatorDraft[]>([]);
  const [buyDraft, setBuyDraft] = useState<LogicBlockDraft>(
    createLogicBlockDraft(),
  );
  const [sellDraft, setSellDraft] = useState<LogicBlockDraft>(
    createLogicBlockDraft(),
  );
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(isEditing);
  const [initialPayloadSnapshot, setInitialPayloadSnapshot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousDebouncedIndicatorSearchRef = useRef(
    debouncedIndicatorSearch.trim(),
  );
  const strategyPlanTier = getStrategyPlanTier(user?.membership);
  const canManagePaidAccess = strategyPlanTier !== "free";
  const maxIndicators = getStrategyIndicatorLimit(strategyPlanTier);
  const maxRulesPerEntry = getStrategyRuleLimit(strategyPlanTier);
  const hasReachedIndicatorLimit = indicatorDrafts.length >= maxIndicators;
  const showIndicatorUpgradeMessage =
    strategyPlanTier === "free"
      ? true
      : strategyPlanTier === "plus"
        ? hasReachedIndicatorLimit
        : false;
  const indicatorLimitLabel =
    strategyPlanTier === "pro"
      ? "Pro plan up to 10 indicators."
      : strategyPlanTier === "plus"
        ? "Plus plan up to 5 indicators."
        : "Free plan up to 2 indicators.";
  const indicatorLimitMessage = `${getStrategyPlanLabel(strategyPlanTier)} plan allows up to ${maxIndicators} indicators.`;
  const ruleLimitLabel = `${getStrategyPlanLabel(strategyPlanTier)} plan up to ${maxRulesPerEntry} rules per entry.`;
  const ruleLimitMessage = `${getStrategyPlanLabel(strategyPlanTier)} plan allows up to ${maxRulesPerEntry} rules per entry.`;
  const ruleUpgradeCtaLabel =
    strategyPlanTier === "free"
      ? "Upgrade to Plus"
      : strategyPlanTier === "plus"
        ? "Upgrade to Pro"
        : null;
  const buyRuleCount = countConditionNodes(buyDraft.conditions);
  const sellRuleCount = countConditionNodes(sellDraft.conditions);
  const hasReachedRuleLimit =
    buyRuleCount >= maxRulesPerEntry || sellRuleCount >= maxRulesPerEntry;
  const showRuleUpgradeMessage =
    strategyPlanTier === "free"
      ? true
      : strategyPlanTier === "plus"
        ? hasReachedRuleLimit
        : false;

  const handleVisibilityChange = (nextIsPublic: boolean) => {
    setIsPublic(nextIsPublic);

    if (!nextIsPublic) {
      setAccessType("free");
    }
  };

  useEffect(() => {
    if (!canManagePaidAccess && accessType === "paid") {
      setAccessType("free");
    }
  }, [accessType, canManagePaidAccess]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedIndicatorSearch(indicatorSearch);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [indicatorSearch]);

  useEffect(() => {
    if (!isIndicatorMenuOpen) {
      return;
    }

    const loadIndicators = async () => {
      const trimmedIndicatorSearch = debouncedIndicatorSearch.trim();
      const isSearchTriggeredFetch =
        trimmedIndicatorSearch !== previousDebouncedIndicatorSearchRef.current;

      if (indicatorPage === 1 && isSearchTriggeredFetch) {
        setIsSearchingIndicators(true);
      } else if (indicatorPage === 1) {
        setIsLoadingIndicators(true);
      } else {
        setIsAppendingIndicators(true);
      }

      try {
        const response = await fetchIndicatorsOnce({
          page: indicatorPage,
          search: trimmedIndicatorSearch,
          sortBy: indicatorSortBy,
          order: indicatorOrder,
          category: indicatorCategory === "all" ? undefined : indicatorCategory,
        });

        const items = response?.result?.indicators ?? [];
        setIndicatorOptions((prev) => {
          if (indicatorPage === 1) {
            return items;
          }

          return Array.from(
            new Map(
              [...prev, ...items].map((item) => [item._id, item]),
            ).values(),
          );
        });
        setIndicatorHasNextPage(Boolean(response?.result?.hasNextPage));
        previousDebouncedIndicatorSearchRef.current = trimmedIndicatorSearch;
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load indicators"));
      } finally {
        setIsSearchingIndicators(false);
        setIsLoadingIndicators(false);
        setIsAppendingIndicators(false);
      }
    };

    void loadIndicators();
  }, [
    isIndicatorMenuOpen,
    debouncedIndicatorSearch,
    indicatorCategory,
    indicatorOrder,
    indicatorPage,
    indicatorSortBy,
  ]);

  const isIndicatorSearchPending =
    indicatorSearch.trim() !== debouncedIndicatorSearch.trim();
  const indicatorStatus =
    isIndicatorSearchPending || isSearchingIndicators
      ? "searching"
      : isLoadingIndicators
        ? "loading"
        : null;

  const handleStrategyLoadFailure = useEffectEvent((message: string) => {
    toast.error(message);
    onRequestClose?.();
    navigate("/strategy");
  });

  useEffect(() => {
    const sourceStrategyId = strategyId || duplicateStrategyId;

    if (!sourceStrategyId) {
      setIsLoadingStrategy(false);
      return;
    }

    const loadStrategy = async () => {
      setIsLoadingStrategy(true);

      try {
        const response = (await fetchStrategyById(
          sourceStrategyId,
        )) as StrategyDetailResponse;
        const strategy = response?.result?.strategy;

        if (!strategy) {
          handleStrategyLoadFailure("Strategy not found");
          return;
        }

        setName(
          isDuplicating
            ? `${strategy.name?.trim() || "Strategy"} - Clone`
            : (strategy.name ?? ""),
        );
        setDescription(strategy.description ?? "");
        setIsPublic(strategy.isPublic ?? true);
        setAccessType(
          strategy.isPublic === false
            ? "free"
            : (strategy.accessType ?? strategy.access?.accessType ?? "free"),
        );

        const nextDrafts =
          strategy.indicators?.reduce<IndicatorDraft[]>((drafts, item) => {
            const indicatorId = item.indicator?._id ?? "";
            const indicatorName =
              item.indicator?.name?.trim() || `indicator_${drafts.length + 1}`;
            const params = createParamDrafts(item.params, indicatorName);

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
            });

            return drafts;
          }, []) ?? [];

        setIndicatorDrafts(nextDrafts);
        setBuyDraft(deserializeLogicBlock(strategy.entry?.buy));
        setSellDraft(deserializeLogicBlock(strategy.entry?.sell));
        setInitialPayloadSnapshot(
          isEditing
            ? JSON.stringify({
                name: strategy.name?.trim() ?? "",
                description: strategy.description?.trim() ?? "",
                isPublic: strategy.isPublic ?? true,
                accessType:
                  strategy.isPublic === false
                    ? "free"
                    : (strategy.accessType ??
                      strategy.access?.accessType ??
                      "free"),
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
                    ]),
                  ),
                })),
                entry: {
                  buy:
                    strategy.entry?.buy ??
                    serializeLogicBlock(createLogicBlockDraft(), "Buy"),
                  sell:
                    strategy.entry?.sell ??
                    serializeLogicBlock(createLogicBlockDraft(), "Sell"),
                },
              })
            : "",
        );

        setIndicatorOptions((prev) =>
          Array.from(
            new Map(
              [
                ...prev,
                ...(strategy.indicators ?? []).flatMap((item) => {
                  if (!item.indicator?._id || !item.indicator?.name) {
                    return [];
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
                  ];
                }),
              ].map((item) => [item._id, item]),
            ).values(),
          ),
        );
      } catch (error: unknown) {
        const responseMessage =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } })
                .response!.data!.message
            : null;

        handleStrategyLoadFailure(
          responseMessage ??
            (error instanceof Error
              ? error.message
              : "Failed to load strategy"),
        );
      } finally {
        setIsLoadingStrategy(false);
      }
    };

    void loadStrategy();
  }, [duplicateStrategyId, isDuplicating, isEditing, strategyId]);

  const indicatorMap = useMemo(
    () => new Map(indicatorOptions.map((item) => [item._id, item])),
    [indicatorOptions],
  );

  const indicatorKeys = useMemo(
    () =>
      indicatorDrafts.flatMap((item) =>
        getIndicatorOutputKeys(item).filter(
          (indicatorKey): indicatorKey is string => Boolean(indicatorKey),
        ),
      ),
    [indicatorDrafts],
  );

  const candleOptions = useMemo(
    () =>
      sourceOptions.map((item) => ({
        label: item,
        value: item,
      })),
    [],
  );

  const indicatorFieldOptions = useMemo(
    () => buildIndicatorDropdownOptions(indicatorKeys),
    [indicatorKeys],
  );

  const usedIndicatorKeys = useMemo(() => {
    const usedKeys = extractUsedIndicatorKeysFromBlock(buyDraft);

    extractUsedIndicatorKeysFromBlock(sellDraft).forEach((usedKey) =>
      usedKeys.add(usedKey),
    );

    return usedKeys;
  }, [buyDraft, sellDraft]);

  const updateIndicatorDraft = (
    draftId: string,
    updater: (draft: IndicatorDraft) => IndicatorDraft,
  ) => {
    setIndicatorDrafts((prev) =>
      prev.map((draft) => (draft.id === draftId ? updater(draft) : draft)),
    );
  };

  const appendIndicatorDraft = (indicatorId: string) => {
    const selected = indicatorMap.get(indicatorId);
    if (!selected) return;

    if (indicatorDrafts.length >= maxIndicators) {
      toast.error(indicatorLimitMessage);
      return;
    }

    const nextParams = createParamDrafts(selected.params, selected.name);
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
    ]);
    setIsIndicatorMenuOpen(false);
    setIndicatorSearch("");
    setIndicatorPage(1);
  };

  const serializeParams = useCallback((params: ParamDraft[]) => {
    const output: Record<string, unknown> = {};

    for (const param of params) {
      if (!param.key.trim()) {
        throw new Error("Indicator param name is required");
      }

      if (param.type === "number") {
        const numeric = Number(param.value);
        if (Number.isNaN(numeric)) {
          throw new Error(`Param "${param.key}" must be a valid number`);
        }
        output[param.key.trim()] = numeric;
        continue;
      }

      if (param.type === "boolean") {
        output[param.key.trim()] = param.value === "true";
        continue;
      }

      output[param.key.trim()] = param.value;
    }

    return output;
  }, []);

  const buildStrategyPayload = useCallback(
    (): CreateStrategyPayload => ({
      name: name.trim(),
      description: description.trim(),
      isPublic,
      accessType: isPublic ? accessType : "free",
      indicators: indicatorDrafts.map((draft) => {
        if (!draft.indicator) {
          throw new Error("Please select an indicator for every row");
        }

        if (!draft.key.trim()) {
          throw new Error("Every indicator needs a key");
        }

        return {
          indicator: draft.indicator,
          key: draft.key.trim(),
          source: draft.source,
          params: serializeParams(draft.params),
        };
      }),
      entry: (() => {
        const hasBuyRules = buyDraft.conditions.length > 0;
        const hasSellRules = sellDraft.conditions.length > 0;

        if (!hasBuyRules && !hasSellRules) {
          throw new Error("Add at least one Buy and Sell rule");
        }

        return {
          buy: serializeLogicBlock(buyDraft, "Buy"),
          sell: serializeLogicBlock(sellDraft, "Sell"),
        };
      })(),
    }),
    [
      name,
      description,
      isPublic,
      accessType,
      indicatorDrafts,
      buyDraft,
      sellDraft,
      serializeParams,
    ],
  );

  const formValidationError = useMemo(() => {
    const nameError = getStrategyNameError(name);
    if (nameError) return nameError;

    if (description.trim().length > STRATEGY_DESCRIPTION_MAX_LENGTH) {
      return `Max ${STRATEGY_DESCRIPTION_MAX_LENGTH} characters`;
    }

    if (indicatorDrafts.length > maxIndicators) {
      return indicatorLimitMessage;
    }

    if (buyRuleCount > maxRulesPerEntry) {
      return `${ruleLimitMessage} Buy Entry has ${buyRuleCount}.`;
    }

    if (sellRuleCount > maxRulesPerEntry) {
      return `${ruleLimitMessage} Sell Entry has ${sellRuleCount}.`;
    }

    try {
      indicatorDrafts.forEach((draft) => {
        if (!draft.indicator) {
          throw new Error("Please select an indicator for every row");
        }

        if (!draft.key.trim()) {
          throw new Error("Every indicator needs a key");
        }

        serializeParams(draft.params);
      });

      buildStrategyPayload();

      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Strategy is not valid yet";
    }
  }, [
    name,
    description,
    indicatorDrafts,
    maxIndicators,
    buyRuleCount,
    sellRuleCount,
    maxRulesPerEntry,
    indicatorLimitMessage,
    ruleLimitMessage,
    serializeParams,
    buildStrategyPayload,
  ]);

  const hasChanges = useMemo(() => {
    if (!isEditing || isLoadingStrategy || formValidationError) {
      return !isEditing;
    }

    try {
      return JSON.stringify(buildStrategyPayload()) !== initialPayloadSnapshot;
    } catch {
      return false;
    }
  }, [
    isEditing,
    isLoadingStrategy,
    formValidationError,
    initialPayloadSnapshot,
    buildStrategyPayload,
  ]);

  const handleSubmit = async () => {
    if (formValidationError) {
      toast.error(formValidationError);
      return;
    }

    if (isEditing && !hasChanges) {
      return;
    }

    try {
      const payload = buildStrategyPayload();

      setIsSubmitting(true);
      const response = isEditing
        ? await updateStrategy(strategyId, payload)
        : await createStrategy(payload);
      const nextStrategyId = response?.result?.strategy?._id || strategyId;

      toast.success(
        isEditing
          ? "Strategy updated successfully"
          : "Strategy created successfully",
      );

      if (onSuccess) {
        onSuccess(nextStrategyId);
        return;
      }

      if (nextStrategyId) {
        navigate(`/strategy/${nextStrategyId}`);
        return;
      }

      navigate("/strategy");
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(
          error,
          isEditing ? "Failed to update strategy" : "Failed to create strategy",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmbeddedSubmit = useEffectEvent(() => {
    void handleSubmit();
  });

  const submitLabel = isEditing ? "Update Strategy" : "Create Strategy";
  const strategyNameError = getStrategyNameError(name);
  const submitDisabled =
    isSubmitting ||
    isLoadingStrategy ||
    isLoadingIndicators ||
    name.trim().length === 0 ||
    Boolean(formValidationError) ||
    (isEditing && !hasChanges);
  const helperText = formValidationError
    ? formValidationError
    : isLoadingStrategy
      ? "Loading strategy..."
      : isEditing && !isLoadingStrategy && !hasChanges
        ? "No changes to update yet."
        : null;

  useEffect(() => {
    if (!embedded || !onEmbeddedControlsChange) return;

    onEmbeddedControlsChange({
      submitLabel,
      submitDisabled,
      isSubmitting,
      isLoadingStrategy,
      helperText,
      onSubmit: handleEmbeddedSubmit,
    });
  }, [
    embedded,
    onEmbeddedControlsChange,
    submitLabel,
    submitDisabled,
    helperText,
    isSubmitting,
    isLoadingStrategy,
    isLoadingIndicators,
    formValidationError,
    hasChanges,
  ]);

  return (
    <fieldset
      disabled={isSubmitting || isLoadingStrategy}
      className={cn(
        "min-w-0 w-full overflow-x-hidden border-0 p-0",
        embedded
          ? "space-y-4 p-4 md:space-y-6 md:p-6"
          : "mx-auto max-w-6xl overflow-hidden rounded-xl border bg-card shadow-sm",
      )}
    >
      {!embedded ? (
        <SheetHeader className="border-b px-4 py-4 md:px-6 md:py-5">
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
                return;
              }

              navigate("/strategy");
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back
            </span>
          </Button>

          <h1 className="font-heading text-base font-medium text-foreground">
            {isEditing
              ? "Edit Strategy"
              : isDuplicating
                ? "Clone Strategy"
                : "Create Strategy"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Edit your strategy."
              : isDuplicating
                ? "Clone, edit, and save as your own."
                : "Build a new strategy."}
          </p>
        </SheetHeader>
      ) : null}

      <div
        className={cn(
          "min-w-0",
          embedded
            ? "space-y-4 md:space-y-6"
            : "space-y-4 p-4 md:space-y-6 md:p-6",
        )}
      >
        <div
          className={cn(
            "grid min-w-0 gap-4",
            !embedded && "lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]",
          )}
        >
          <div className="min-w-0 space-y-4">
            <div className="min-w-0 space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="strategy-name"
                  className="text-muted-foreground"
                >
                  Strategy Name
                </Label>
                <Input
                  id="strategy-name"
                  value={name}
                  aria-invalid={Boolean(strategyNameError)}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter strategy name"
                />
                {strategyNameError ? (
                  <p className="text-xs text-destructive">
                    {strategyNameError}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="strategy-description"
                  className="text-muted-foreground"
                >
                  Description
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-3 right-3 text-xs text-muted-foreground">
                    {description.length}/{STRATEGY_DESCRIPTION_MAX_LENGTH}
                  </span>
                  <Textarea
                    id="strategy-description"
                    value={description}
                    maxLength={STRATEGY_DESCRIPTION_MAX_LENGTH}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Buy on bullish EMA crossover with RSI confirmation, sell on bearish crossover."
                    className="h-14 field-sizing-fixed resize-none overflow-y-auto whitespace-pre-wrap break-all pr-14"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-muted-foreground">
                  Visibility & Access
                </Label>
                <div className="flex items-start justify-between gap-4 py-1">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="pt-0.5">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Private</p>
                      <p className="text-xs text-muted-foreground">
                        Build your own private strategy.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={!isPublic}
                    onCheckedChange={(checked) => {
                      handleVisibilityChange(!checked);
                    }}
                  />
                </div>

                {isPublic ? (
                  <>
                    <div className="h-px bg-border/70" />

                    <div className="flex items-start justify-between gap-4 py-1">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="pt-0.5">
                          <BadgeDollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">Paid</p>
                            {!canManagePaidAccess ? (
                              <Link
                                to="/pricing"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Unlock on paid plan
                              </Link>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Earn tokens when users backtest with your strategy.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={accessType === "paid"}
                        disabled={!canManagePaidAccess}
                        onCheckedChange={(checked) => {
                          setAccessType(checked ? "paid" : "free");
                        }}
                      />
                    </div>
                  </>
                ) : null}
                {isPublic ? (
                  <p className="text-xs text-muted-foreground">
                    {!canManagePaidAccess
                      ? "Paid strategy access unlocks on paid plans."
                      : accessType === "paid"
                        ? "Public paid strategies are available to users on paid plans."
                        : "Public free strategies are available to everyone."}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <h3 className="text-base font-semibold">Indicators</h3>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span>{indicatorLimitLabel}</span>
                    {showIndicatorUpgradeMessage &&
                    strategyPlanTier === "free" ? (
                      <Link
                        to="/pricing"
                        className="font-medium text-sky-500 transition-colors hover:text-sky-400"
                      >
                        Upgrade to Plus for more
                      </Link>
                    ) : showIndicatorUpgradeMessage &&
                      strategyPlanTier === "plus" ? (
                      <Link
                        to="/pricing"
                        className="font-medium text-amber-500 transition-colors hover:text-amber-400"
                      >
                        Upgrade to Pro for more
                      </Link>
                    ) : null}
                  </p>
                  <span className="font-medium">
                    {indicatorDrafts.length}/{maxIndicators}
                  </span>
                </div>
                <Dialog
                  open={isIndicatorMenuOpen}
                  onOpenChange={(open) => {
                    if (open && hasReachedIndicatorLimit) {
                      toast.error(indicatorLimitMessage);
                      return;
                    }
                    setIsIndicatorMenuOpen(open);
                    if (open) {
                      setIndicatorPage(1);
                    }
                    if (!open) {
                      setIndicatorSearch("");
                      setIndicatorCategory("all");
                      setIndicatorSortBy("name");
                      setIndicatorOrder("asc");
                      setIndicatorPage(1);
                      setIsAppendingIndicators(false);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={hasReachedIndicatorLimit}
                      className="h-auto w-full min-w-0 justify-between rounded-lg border-border/70 bg-background px-3 py-2.5 text-left whitespace-normal hover:bg-muted/30"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            Add indicator
                          </span>
                          <span className="block break-words text-xs text-muted-foreground">
                            {hasReachedIndicatorLimit
                              ? indicatorLimitMessage
                              : "Search and configure an indicator"}
                          </span>
                        </span>
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 md:top-[10vh] md:max-w-2xl"
                    onOpenAutoFocus={(event) => {
                      event.preventDefault();
                    }}
                  >
                    <DialogHeader className="border-b px-4 pt-4 pb-3">
                      <DialogTitle>Add Indicator</DialogTitle>
                      <DialogDescription>
                        Browse and select an indicator to add to this strategy.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 px-4 py-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end">
                        <div className="relative min-w-0 flex-1">
                          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={indicatorSearch}
                            onChange={(event) => {
                              setIndicatorSearch(event.target.value);
                              setIndicatorPage(1);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") {
                                return;
                              }

                              const firstIndicator = indicatorOptions[0];
                              if (!firstIndicator) {
                                return;
                              }

                              event.preventDefault();
                              appendIndicatorDraft(firstIndicator._id);
                              setIsIndicatorMenuOpen(false);
                            }}
                            placeholder="Search"
                            className="w-full rounded-md border-0 border-b-2 border-foreground/15 bg-muted/60 pr-10 pl-9 focus-visible:border-primary focus-visible:ring-0 dark:bg-input/30"
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
                                    const nextSortBy =
                                      value as IndicatorSortField;
                                    setIndicatorSortBy(nextSortBy);
                                    if (nextSortBy === "createdAt") {
                                      setIndicatorOrder("desc");
                                    }
                                    if (nextSortBy === "name") {
                                      setIndicatorOrder("asc");
                                    }
                                    setIndicatorPage(1);
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
                                    setIndicatorOrder(value as SortOrder);
                                    setIndicatorPage(1);
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
                                  indicatorCategoryOptions.find(
                                    (option) =>
                                      option.value === indicatorCategory,
                                  )?.label
                                }
                                <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <DropdownMenuLabel>Category</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={indicatorCategory}
                                onValueChange={(value) => {
                                  setIndicatorCategory(
                                    value as IndicatorCategory | "all",
                                  );
                                  setIndicatorPage(1);
                                }}
                              >
                                {indicatorCategoryOptions.map((option) => (
                                  <DropdownMenuRadioItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {indicatorStatus ? (
                      <div className="flex items-center justify-center gap-2 px-4 pt-3 pb-4 text-sm text-muted-foreground">
                        {indicatorStatus === "searching" ? (
                          <>
                            <Search className="h-4 w-4 animate-pulse" />
                            <span>Searching indicator....</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading indicator....</span>
                          </>
                        )}
                      </div>
                    ) : indicatorOptions.length === 0 ? (
                      <p className="flex items-center justify-center px-4 pt-3 pb-4 text-center text-sm text-muted-foreground">
                        No indicators found.
                      </p>
                    ) : indicatorOptions.length > 0 ? (
                      <Command
                        shouldFilter={false}
                        className="rounded-none bg-transparent p-0"
                      >
                        <ScrollArea
                          className={cn(
                            "px-4 py-3",
                            indicatorOptions.length > 4 && "h-[320px]",
                          )}
                          onScrollCapture={(event) => {
                            const node = event.target as HTMLElement;
                            const distanceToBottom =
                              node.scrollHeight -
                              node.scrollTop -
                              node.clientHeight;

                            if (
                              distanceToBottom < 24 &&
                              indicatorHasNextPage &&
                              !indicatorStatus &&
                              !isAppendingIndicators
                            ) {
                              setIndicatorPage((prev) => prev + 1);
                            }
                          }}
                        >
                          <CommandList className="max-h-none overflow-visible px-0 py-0">
                            <CommandGroup className="space-y-1 p-0">
                              {indicatorOptions.map((item) => (
                                <CommandItem
                                  key={item._id}
                                  value={`${item.name} ${item.category} ${item.description}`}
                                  className="px-3 py-1.5 text-left"
                                  onSelect={() => {
                                    appendIndicatorDraft(item._id);
                                    setIsIndicatorMenuOpen(false);
                                  }}
                                >
                                  <div className="min-w-0 w-full space-y-0.5">
                                    <p className="truncate text-sm font-medium text-foreground">
                                      {item.name}
                                    </p>
                                    <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">
                                      {item.description}
                                    </p>
                                  </div>
                                </CommandItem>
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
                            </CommandGroup>
                          </CommandList>
                        </ScrollArea>
                      </Command>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>

              {indicatorDrafts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No indicators added yet. Click the Add indicator button to
                  choose one.
                </div>
              ) : (
                indicatorDrafts.map((draft, index) => {
                  const isUsedInStrategy = isIndicatorDraftUsed(
                    draft,
                    usedIndicatorKeys,
                  );

                  return (
                    <div
                      key={draft.id}
                      className="rounded-xl border border-border/60 p-2.5 md:p-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="text-sm font-medium break-words">
                            {index + 1}.{" "}
                            {draft.indicatorName || "Unknown indicator"}
                          </p>
                          {draft.params.length === 0 ? (
                            <p className="text-xs break-words text-muted-foreground">
                              No params
                            </p>
                          ) : (
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {draft.params.map((param) => (
                                <p key={param.id} className="break-words">
                                  {param.key}: {param.value}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2 self-start md:self-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label={`Edit indicator ${index + 1}`}
                                title="Edit indicator"
                              >
                                <Settings2 className="size-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              onOpenAutoFocus={(event) =>
                                event.preventDefault()
                              }
                              className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 md:top-[10vh] md:max-w-[420px]"
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
                                <div className="grid items-center gap-2 md:grid-cols-[72px_minmax(0,1fr)] md:gap-3">
                                  <div>
                                    <Label>source</Label>
                                  </div>
                                  <div className="md:max-w-[180px]">
                                    <DropdownField
                                      value={draft.source}
                                      onChange={(nextSource) =>
                                        updateIndicatorDraft(
                                          draft.id,
                                          (current) => ({
                                            ...current,
                                            source: nextSource,
                                          }),
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
                                          const paramHelpText =
                                            getParamHelpText(param.key);

                                          return (
                                            <div
                                              key={param.id}
                                              className={cn(
                                                "grid items-center gap-1.5 md:gap-2",
                                                param.type === "boolean"
                                                  ? "grid-cols-[minmax(0,1fr)_auto]"
                                                  : "md:grid-cols-[minmax(0,1fr)_minmax(120px,160px)]",
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
                                                    : "md:max-w-[160px]"
                                                }
                                              >
                                                {param.type === "boolean" ? (
                                                  <div className="flex h-8 items-center">
                                                    <Switch
                                                      checked={
                                                        param.value === "true"
                                                      }
                                                      onCheckedChange={(
                                                        checked,
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
                                                                    : item,
                                                              );
                                                            const indicatorName =
                                                              current.indicatorName ??
                                                              "";

                                                            return {
                                                              ...current,
                                                              params,
                                                              key: indicatorName
                                                                ? buildUniqueIndicatorKey(
                                                                    indicatorName,
                                                                    params,
                                                                    indicatorDrafts,
                                                                    current.id,
                                                                  )
                                                                : current.key,
                                                            };
                                                          },
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
                                                                                .value,
                                                                            )
                                                                          : event
                                                                              .target
                                                                              .value,
                                                                    }
                                                                  : item,
                                                            );
                                                          const indicatorName =
                                                            current.indicatorName ??
                                                            "";

                                                          return {
                                                            ...current,
                                                            params,
                                                            key: indicatorName
                                                              ? buildUniqueIndicatorKey(
                                                                  indicatorName,
                                                                  params,
                                                                  indicatorDrafts,
                                                                  current.id,
                                                                )
                                                              : current.key,
                                                          };
                                                        },
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
                                                                              item.defaultValue,
                                                                            )
                                                                          : item.value,
                                                                    }
                                                                  : item,
                                                            );
                                                          const indicatorName =
                                                            current.indicatorName ??
                                                            "";

                                                          return {
                                                            ...current,
                                                            params,
                                                            key: indicatorName
                                                              ? buildUniqueIndicatorKey(
                                                                  indicatorName,
                                                                  params,
                                                                  indicatorDrafts,
                                                                  current.id,
                                                                )
                                                              : current.key,
                                                          };
                                                        },
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
                                          );
                                        })(),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => {
                              if (isUsedInStrategy) return;

                              setIndicatorDrafts((prev) =>
                                prev.filter((item) => item.id !== draft.id),
                              );
                            }}
                            disabled={isUsedInStrategy}
                            aria-label={`Clear indicator ${index + 1}`}
                            title={
                              isUsedInStrategy
                                ? "This indicator is used in rules or risk settings, so clear is disabled"
                                : "Clear indicator"
                            }
                          >
                            {isUsedInStrategy ? (
                              <Lock className="size-4" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p className="flex flex-wrap items-center gap-1.5">
                <span>{ruleLimitLabel}</span>
                {showRuleUpgradeMessage && strategyPlanTier === "free" ? (
                  <Link
                    to="/pricing"
                    className="font-medium text-sky-500 transition-colors hover:text-sky-400"
                  >
                    Upgrade to Plus for more
                  </Link>
                ) : showRuleUpgradeMessage && strategyPlanTier === "plus" ? (
                  <Link
                    to="/pricing"
                    className="font-medium text-amber-500 transition-colors hover:text-amber-400"
                  >
                    Upgrade to Pro for more
                  </Link>
                ) : null}
              </p>
            </div>
            <LogicBlockEditor
              title="Buy Entry"
              description="Set the buy-side root logic, nested conditions, and risk management."
              draft={buyDraft}
              candleOptions={candleOptions}
              indicatorFieldOptions={indicatorFieldOptions}
              indicatorKeys={indicatorKeys}
              maxRules={maxRulesPerEntry}
              ruleLimitMessage={ruleLimitMessage}
              upgradeCtaLabel={ruleUpgradeCtaLabel}
              onChange={setBuyDraft}
            />

            <LogicBlockEditor
              title="Sell Entry"
              description="Set the sell-side root logic, nested conditions, and risk management."
              draft={sellDraft}
              candleOptions={candleOptions}
              indicatorFieldOptions={indicatorFieldOptions}
              indicatorKeys={indicatorKeys}
              maxRules={maxRulesPerEntry}
              ruleLimitMessage={ruleLimitMessage}
              upgradeCtaLabel={ruleUpgradeCtaLabel}
              onChange={setSellDraft}
            />
          </div>
        </div>
      </div>

      {!embedded ? (
        <SheetFooter className="border-t px-4 pt-4 pb-6 md:px-6">
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitDisabled}
            className="relative w-full md:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="absolute h-4 w-4 animate-spin" />
            ) : null}
            <span className={isSubmitting ? "opacity-0" : undefined}>
              {submitLabel}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            disabled={isSubmitting || isLoadingStrategy}
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
                return;
              }

              navigate("/strategy");
            }}
          >
            Cancel
          </Button>
          {helperText ? (
            <p className="w-full text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </SheetFooter>
      ) : null}
    </fieldset>
  );
}
