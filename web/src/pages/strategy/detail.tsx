import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  Copy,
  CopyPlus,
  Eye,
  Globe,
  HandCoins,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import { createBookmark, deleteBookmark } from "@/api/bookmark";
import { createFollow, deleteFollow } from "@/api/follow";
import { deleteStrategy, fetchStrategyById } from "@/api/strategy";
import type { StrategyAccessState, StrategyAccessType } from "@/api/strategy";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  getUserAvatarRingClass,
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import NotFoundPage from "@/pages/not-found";

type ConditionNode =
  | { logic: "and" | "or"; conditions: ConditionNode[] }
  | { left: unknown; operator: string; right: unknown };
type ConditionGroupNode = Extract<
  ConditionNode,
  { conditions: ConditionNode[] }
>;
type ConditionRuleNode = Extract<ConditionNode, { left: unknown }>;

type LogicBlock = {
  logic: "and" | "or";
  conditions: ConditionNode[];
  riskManagement?: {
    stopLoss?: Record<string, unknown>;
    takeProfit?: Record<string, unknown>;
  };
};

type StrategyDetailItem = {
  _id: string;
  name: string;
  description?: string;
  isBookmarked?: boolean;
  isPublic?: boolean;
  accessType?: StrategyAccessType;
  access?: StrategyAccessState;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    _id?: string;
    name?: string;
    username?: string;
    avatar?: string;
    membership?: UserMembership;
    isFollowing?: boolean;
    stats?: {
      followerCount?: number;
      strategyCount?: number;
      backtestCount?: number;
    };
  };
  stats?: { viewCount?: number; bookmarkCount?: number };
  indicators?: Array<{
    key?: string;
    source?: "open" | "high" | "low" | "close" | "volume";
    params?: Record<string, unknown>;
    indicator?: {
      _id?: string;
      name?: string;
      category?: string;
      description?: string;
    };
  }>;
  entry?: { buy: LogicBlock; sell: LogicBlock };
};

type StrategyDetailResponse = { result?: { strategy?: StrategyDetailItem } };

const strategyDetailRequestCache = new Map<
  string,
  Promise<StrategyDetailItem | null>
>();

async function loadStrategyDetailOnce(strategyId: string) {
  const existingRequest = strategyDetailRequestCache.get(strategyId);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const response = (await fetchStrategyById(
      strategyId,
    )) as StrategyDetailResponse;
    return response?.result?.strategy ?? null;
  })().finally(() => {
    strategyDetailRequestCache.delete(strategyId);
  });

  strategyDetailRequestCache.set(strategyId, request);
  return request;
}

function isConditionGroup(node: ConditionNode): node is ConditionGroupNode {
  return "conditions" in node && Array.isArray(node.conditions);
}

function isConditionRule(node: ConditionNode): node is ConditionRuleNode {
  return "left" in node && "operator" in node && "right" in node;
}

function formatOperand(value: unknown) {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatStopLoss(
  stopLoss?: Record<string, unknown>,
  tone?: "buy" | "sell",
) {
  if (!stopLoss?.type) return "Not configured";
  switch (stopLoss.type) {
    case "candle": {
      const previousCandles = stopLoss.previousCandles;
      const aggregation = stopLoss.aggregation;
      if (
        typeof previousCandles === "number" &&
        typeof aggregation === "string"
      ) {
        const candleLabel =
          previousCandles === 0
            ? "Current candle"
            : `Previous ${previousCandles} candle${previousCandles === 1 ? "" : "s"}`;
        const priceField =
          tone === "buy" ? "low" : tone === "sell" ? "high" : null;
        return priceField
          ? `${candleLabel} (${aggregation}, ${priceField})`
          : `${candleLabel} (${aggregation})`;
      }
      return `Candle ${String(stopLoss.reference ?? "")} ${String(stopLoss.price ?? "")}`.trim();
    }
    case "indicator":
      return `Indicator ${String(stopLoss.indicator ?? "")}`.trim();
    case "percent":
      return `${String(stopLoss.value ?? "")}%`;
    case "atr":
      return `ATR ${String(stopLoss.period ?? "")} x ${String(stopLoss.multiplier ?? "")}`.trim();
    default:
      return String(stopLoss.type);
  }
}

function formatTakeProfit(takeProfit?: Record<string, unknown>) {
  if (!takeProfit?.type) return "Not configured";
  switch (takeProfit.type) {
    case "riskReward":
      return `${String(takeProfit.ratio ?? "")}R`;
    case "percent":
      return `${String(takeProfit.value ?? "")}%`;
    case "indicator":
      return `Indicator ${String(takeProfit.indicator ?? "")}`.trim();
    default:
      return String(takeProfit.type);
  }
}

function formatDateLabel(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCompactNumber(value?: number) {
  if (!Number.isFinite(value)) return "0";

  const safeValue = value ?? 0;

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safeValue);
}

function formatIndicatorParams(params?: Record<string, unknown>) {
  if (!params) return [];
  return Object.entries(params).filter(([, value]) => value !== undefined);
}

function getStrategyLoadErrorMessage(loadError: string) {
  if (!loadError) {
    return "Strategy not found.";
  }

  if (/not found/i.test(loadError)) {
    return "Strategy not found.";
  }

  return "Unable to open this strategy.";
}

function countConditionNodes(nodes: ConditionNode[]): number {
  return nodes.reduce(
    (count, node) =>
      isConditionGroup(node)
        ? count + countConditionNodes(node.conditions)
        : count + 1,
    0,
  );
}

function formatConditionNodeSummary(node: ConditionNode): string {
  if (isConditionGroup(node)) {
    const nested = node.conditions
      .map((child) => formatConditionNodeSummary(child))
      .filter(Boolean)
      .join(` ${node.logic} `);
    return nested ? `(${nested})` : "";
  }
  if (!isConditionRule(node)) return "";
  return `${formatOperand(node.left)} ${node.operator} ${formatOperand(node.right)}`;
}

function LogicWord({
  logic,
  tone,
}: {
  logic: "and" | "or";
  tone: "buy" | "sell";
}) {
  return (
    <span
      className={cn(
        "mx-1 inline-flex text-[10px] font-semibold uppercase",
        tone === "buy" ? "text-success" : "text-destructive",
      )}
    >
      {logic}
    </span>
  );
}

function RuleExpression({
  node,
  tone,
}: {
  node: ConditionNode;
  tone: "buy" | "sell";
}) {
  if (isConditionGroup(node)) {
    return (
      <span
        className={cn(
          "inline-flex flex-wrap items-center rounded-2xl border px-2 py-1",
          tone === "buy" ? "border-success/18" : "border-destructive/16",
        )}
      >
        {node.conditions.map((child, index) => (
          <span
            key={`${formatConditionNodeSummary(child)}-${index}`}
            className="inline-flex flex-wrap items-center"
          >
            {index > 0 ? <LogicWord logic={node.logic} tone={tone} /> : null}
            <RuleExpression node={child} tone={tone} />
          </span>
        ))}
      </span>
    );
  }

  if (!isConditionRule(node)) return null;

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center rounded-2xl px-2 py-1 text-xs leading-5 font-medium",
        tone === "buy" ? "bg-success/18" : "bg-destructive/16",
      )}
    >
      <span className="break-all">{formatOperand(node.left)}</span>
      <span
        className={cn(
          "mx-1 inline-flex min-w-[1.25rem] items-center justify-center px-1 py-0.5 text-center text-[10px] leading-none font-semibold",
          tone === "buy" ? "text-success" : "text-destructive",
        )}
      >
        {node.operator}
      </span>
      <span className="break-all">{formatOperand(node.right)}</span>
    </span>
  );
}

function RiskTile({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "stopLoss" | "takeProfit";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="shrink-0 pt-0.5 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "text-right text-sm leading-5 font-medium break-words [overflow-wrap:anywhere]",
          variant === "stopLoss" ? "text-destructive" : "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RulePanel({
  title,
  block,
  tone,
}: {
  title: string;
  block?: LogicBlock;
  tone: "buy" | "sell";
}) {
  const rules = block?.conditions ?? [];
  const ruleCount = countConditionNodes(rules);
  const isBuy = tone === "buy";

  return (
    <Card className="min-w-0 overflow-hidden border-border/70">
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
            {isBuy
              ? "Conditions used to trigger long entries."
              : "Conditions used to trigger short entries."}
          </CardDescription>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Rules
            </p>
            <span className="text-[11px] text-muted-foreground">
              {ruleCount === 1 ? "1 rule" : `${ruleCount} rules`}
            </span>
          </div>
          {rules.length ? (
            <div className="text-left leading-9">
              {rules.map((node, index) => (
                <span
                  key={`${formatConditionNodeSummary(node)}-${index}`}
                  className="inline-flex flex-wrap items-center"
                >
                  {index > 0 ? (
                    <LogicWord logic={block?.logic ?? "and"} tone={tone} />
                  ) : null}
                  <RuleExpression node={node} tone={tone} />
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No rules available.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Risk Setup
          </p>
        </div>

        <div className="space-y-2.5">
          <RiskTile
            label="Stop Loss"
            value={formatStopLoss(block?.riskManagement?.stopLoss, tone)}
            variant="stopLoss"
          />
          <RiskTile
            label="Take Profit"
            value={formatTakeProfit(block?.riskManagement?.takeProfit)}
            variant="takeProfit"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function StrategyDetailPage() {
  const { strategyId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const [strategy, setStrategy] = useState<StrategyDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false);
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);
  const [isStrategyBookmarkUpdating, setIsStrategyBookmarkUpdating] =
    useState(false);
  const creatorUserId = strategy?.user?._id ?? "";
  const isMine = Boolean(user?._id) && creatorUserId === user?._id;

  useEffect(() => {
    if (!strategyId) {
      setStrategy(null);
      setIsFollowingCreator(false);
      setIsLoading(false);
      setLoadError("Missing strategy id.");
      return;
    }

    let isActive = true;

    const loadStrategy = async () => {
      setIsLoading(true);
      setLoadError("");
      setStrategy(null);
      setIsFollowingCreator(false);
      setIsStrategyBookmarkUpdating(false);

      try {
        const nextStrategy = await loadStrategyDetailOnce(strategyId);

        if (!nextStrategy) throw new Error("Strategy not found");

        const creatorId = nextStrategy.user?._id ?? "";

        if (!isActive) return;

        setStrategy(nextStrategy);
        setIsFollowingCreator(
          isAuthenticated && Boolean(creatorId) && creatorId !== user?._id
            ? Boolean(nextStrategy.user?.isFollowing)
            : false,
        );
      } catch (error) {
        if (!isActive) return;
        setStrategy(null);
        setIsFollowingCreator(false);
        const message =
          typeof error === "object" && error !== null
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : undefined;

        setLoadError(message || "Failed to load strategy.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadStrategy();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, strategyId, user?._id]);

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[160px] w-full max-w-7xl items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading strategy...
        </div>
      </div>
    );
  }

  if (!strategy && /not found/i.test(loadError)) {
    return <NotFoundPage />;
  }

  const creatorUsername = strategy?.user?.username?.trim().replace(/^@/, "");
  const strategyDescription = strategy?.description?.trim() || "No description";
  const canOpenCreatorProfile = Boolean(creatorUsername);
  const isBookmarked = Boolean(strategy?.isBookmarked);
  const backtestStrategyState = strategy
    ? {
        strategy: {
          _id: strategy._id,
          name: strategy.name,
          description: strategy.description,
          isPublic: strategy.isPublic,
          accessType:
            strategy.access?.accessType ?? strategy.accessType ?? "free",
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
      }
    : undefined;
  const onToggleBookmark = async () => {
    if (!strategy) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to bookmark strategies.");
      return;
    }

    if (isStrategyBookmarkUpdating) return;

    setIsStrategyBookmarkUpdating(true);

    try {
      const response = isBookmarked
        ? await deleteBookmark({
            targetType: "strategy",
            targetId: strategy._id,
          })
        : await createBookmark({
            targetType: "strategy",
            target: strategy._id,
          });

      setStrategy((prev) =>
        prev
          ? {
              ...prev,
              isBookmarked: !isBookmarked,
              stats: {
                ...prev.stats,
                bookmarkCount: Math.max(
                  0,
                  (prev.stats?.bookmarkCount ?? 0) + (isBookmarked ? -1 : 1),
                ),
              },
            }
          : prev,
      );
      toast.success(
        response?.message ||
          (isBookmarked
            ? "Bookmark removed successfully."
            : "Bookmarked successfully."),
      );
    } catch (error) {
      const status =
        typeof error === "object" && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (isBookmarked && status === 404) {
        setStrategy((prev) =>
          prev
            ? {
                ...prev,
                isBookmarked: false,
                stats: {
                  ...prev.stats,
                  bookmarkCount: Math.max(
                    0,
                    (prev.stats?.bookmarkCount ?? 0) - 1,
                  ),
                },
              }
            : prev,
        );
        toast.success("Bookmark removed successfully.");
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update bookmark"));
    } finally {
      setIsStrategyBookmarkUpdating(false);
    }
  };

  const onCopyStrategyLink = async () => {
    if (!strategy) return;

    const strategyUrl = `${window.location.origin}/strategy/${strategy._id}`;

    try {
      await navigator.clipboard.writeText(strategyUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const onCloneStrategy = () => {
    if (!strategy) return;
    navigate("/strategy", {
      state: {
        openStrategyBuilder: true,
        duplicateStrategyId: strategy._id,
      },
    });
  };

  const onCopyCreatorProfileLink = async () => {
    if (!creatorUsername) return;

    const profileUrl = `${window.location.origin}/${creatorUsername}`;

    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const onToggleCreatorFollow = async () => {
    const creatorId = strategy?.user?._id;
    if (!creatorId || !isAuthenticated || isMine) return;

    setIsFollowUpdating(true);

    try {
      const response = isFollowingCreator
        ? await deleteFollow(creatorId)
        : await createFollow(creatorId);

      setIsFollowingCreator((prev) => !prev);
      setStrategy((prev) =>
        prev
          ? {
              ...prev,
              user: prev.user
                ? {
                    ...prev.user,
                    stats: {
                      ...prev.user.stats,
                      followerCount: Math.max(
                        0,
                        (prev.user.stats?.followerCount ?? 0) +
                          (isFollowingCreator ? -1 : 1),
                      ),
                    },
                  }
                : prev.user,
            }
          : prev,
      );
      toast.success(
        response?.message ||
          (isFollowingCreator
            ? "User unfollowed successfully."
            : "User followed successfully."),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update follow status"));
    } finally {
      setIsFollowUpdating(false);
    }
  };

  const onDeleteStrategy = async () => {
    if (!strategy) return;

    setIsDeleting(true);

    try {
      const promise = deleteStrategy(strategy._id);

      await promise;
      navigate("/strategy", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete strategy"));
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const fromProfileUsername =
    typeof location.state === "object" &&
    location.state !== null &&
    "fromProfileUsername" in location.state &&
    typeof (location.state as { fromProfileUsername?: unknown })
      .fromProfileUsername === "string"
      ? (location.state as { fromProfileUsername: string }).fromProfileUsername
      : "";
  const fromProfileUrl =
    typeof location.state === "object" &&
    location.state !== null &&
    "fromProfileUrl" in location.state &&
    typeof (location.state as { fromProfileUrl?: unknown }).fromProfileUrl ===
      "string"
      ? (location.state as { fromProfileUrl: string }).fromProfileUrl
      : "";

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 overflow-x-hidden">
      <div className="min-w-0 space-y-5 p-1 text-foreground">
        <Card className="relative min-w-0 overflow-hidden border-border/70">
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                className="w-fit px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (fromProfileUrl) {
                    navigate(fromProfileUrl, { replace: true });
                    return;
                  }

                  if (fromProfileUsername) {
                    navigate(`/${fromProfileUsername}`);
                    return;
                  }

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

              {!isLoading && strategy ? (
                <ButtonGroup className="shrink-0">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-r-none border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-background/60 hover:text-foreground"
                    aria-label={isBookmarked ? "Bookmarked" : "Bookmark"}
                    title={isBookmarked ? "Bookmarked" : "Bookmark"}
                    disabled={isStrategyBookmarkUpdating}
                    onClick={() => {
                      void onToggleBookmark();
                    }}
                  >
                    {isStrategyBookmarkUpdating ? (
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
                        className="-ml-px shrink-0 rounded-l-none border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-background/60 hover:text-foreground"
                        aria-label="More actions"
                        title="More actions"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 min-w-44">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/backtest"
                          state={backtestStrategyState}
                          className="flex items-center gap-2"
                        >
                          <CandlestickChart className="h-4 w-4" />
                          Backtest
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          void onCopyStrategyLink();
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          void onToggleBookmark();
                        }}
                        disabled={isStrategyBookmarkUpdating}
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
                              navigate("/strategy", {
                                state: {
                                  openStrategyBuilder: true,
                                  editStrategyId: strategy._id,
                                },
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setIsDeleteConfirmOpen(true);
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
                              onCloneStrategy();
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
              ) : null}
            </div>

            {loadError || !strategy ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {getStrategyLoadErrorMessage(loadError)}
              </div>
            ) : (
              <div className="min-w-0 overflow-hidden space-y-1">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                    Strategy Detail
                  </span>
                </div>

                <CardTitle
                  className="line-clamp-2 block min-w-0 w-full max-w-full break-all text-xl leading-tight tracking-tight"
                  title={strategy.name}
                >
                  {strategy.name}
                </CardTitle>
                <CardDescription
                  className="block min-w-0 w-full max-w-full break-all text-sm leading-6"
                  title={strategyDescription}
                >
                  {strategyDescription}
                </CardDescription>

                <div className="pt-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <span className="truncate">
                          @{strategy.user?.username || "unknown"}
                        </span>
                        <UserMembershipMark
                          membership={strategy.user?.membership}
                          className="size-3"
                        />
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      {strategy.isPublic ? (
                        <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>
                        {isMine
                          ? "Mine"
                          : strategy.isPublic
                            ? "Public"
                            : "Private"}
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      {(strategy.access?.accessType ?? strategy.accessType) ===
                      "paid" ? (
                        <BadgeDollarSign className="h-3.5 w-3.5 shrink-0 text-primary" />
                      ) : (
                        <HandCoins className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>
                        {(strategy.access?.accessType ??
                          strategy.accessType) === "paid"
                          ? "Paid"
                          : "Free"}
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{strategy.stats?.viewCount ?? 0}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{strategy.stats?.bookmarkCount ?? 0}</span>
                    </span>
                    <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {formatDateLabel(strategy.updatedAt)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {!isLoading && strategy ? (
        <div className="min-w-0 space-y-5">
          <div className="min-w-0 px-4 py-4">
            <div className="space-y-4">
              <div className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Creator
              </div>

              <div className="space-y-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 md:flex-1 md:gap-6">
                    <Avatar
                      className={cn(
                        "h-10 w-10 md:h-12 md:w-12",
                        getUserAvatarRingClass(strategy.user?.membership),
                      )}
                    >
                      <AvatarImage
                        src={strategy.user?.avatar}
                        alt={
                          strategy.user?.name ||
                          strategy.user?.username ||
                          "Creator"
                        }
                      />
                      <AvatarFallback>
                        {(
                          strategy.user?.name?.trim()?.[0] ||
                          strategy.user?.username?.trim()?.[0] ||
                          "U"
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground md:text-base">
                          {strategy.user?.name?.trim() ||
                            strategy.user?.username ||
                            "Unknown"}
                        </p>
                        <UserMembershipMark
                          membership={strategy.user?.membership}
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground md:text-sm">
                        @{strategy.user?.username || "unknown"}
                      </p>
                    </div>
                    <div className="hidden min-w-0 grid-cols-3 gap-3 text-center md:grid md:max-w-[320px] md:flex-none">
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                          {formatCompactNumber(
                            strategy.user?.stats?.followerCount,
                          )}
                        </p>
                        <p className="break-words text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                          Followers
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                          {formatCompactNumber(
                            strategy.user?.stats?.strategyCount,
                          )}
                        </p>
                        <p className="break-words text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                          Strategies
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                          {formatCompactNumber(
                            strategy.user?.stats?.backtestCount,
                          )}
                        </p>
                        <p className="break-words text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                          Backtests
                        </p>
                      </div>
                    </div>
                  </div>
                  {!isMine ? (
                    <ButtonGroup className="w-auto shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={isFollowingCreator ? "outline" : "default"}
                        className="relative min-w-0 rounded-r-none px-2.5 md:flex-1"
                        disabled={!isAuthenticated || isFollowUpdating}
                        onClick={() => {
                          if (isFollowingCreator) {
                            setIsUnfollowDialogOpen(true);
                            return;
                          }

                          void onToggleCreatorFollow();
                        }}
                      >
                        {isFollowUpdating ? (
                          <Loader2 className="absolute h-4 w-4 animate-spin" />
                        ) : null}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            isFollowUpdating && "opacity-0",
                          )}
                        >
                          {isFollowingCreator ? (
                            <>
                              <UserCheck className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                Following
                              </span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              <span className="hidden sm:inline">Follow</span>
                            </>
                          )}
                        </span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant={isFollowingCreator ? "outline" : "default"}
                            className="-ml-px shrink-0 rounded-l-none"
                            aria-label="More follow actions"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canOpenCreatorProfile ? (
                            <DropdownMenuItem asChild>
                              <Link
                                to={isMine ? "/profile" : `/${creatorUsername}`}
                                className="flex items-center gap-2"
                              >
                                <UserRound className="h-4 w-4" />
                                Profile
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              <UserRound className="h-4 w-4" />
                              Profile
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => {
                              void onCopyCreatorProfileLink();
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Copy link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!isAuthenticated || isFollowUpdating}
                            onSelect={() => {
                              if (isFollowingCreator) {
                                setIsUnfollowDialogOpen(true);
                                return;
                              }

                              void onToggleCreatorFollow();
                            }}
                          >
                            {isFollowingCreator ? (
                              <>
                                <UserCheck className="h-4 w-4" />
                                Unfollow
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                Follow
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ButtonGroup>
                  ) : null}
                </div>
                <div className="grid min-w-0 grid-cols-3 gap-2 text-center md:hidden">
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="text-base font-semibold tracking-tight text-foreground">
                      {formatCompactNumber(strategy.user?.stats?.followerCount)}
                    </p>
                    <p className="break-words text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      Followers
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="text-base font-semibold tracking-tight text-foreground">
                      {formatCompactNumber(strategy.user?.stats?.strategyCount)}
                    </p>
                    <p className="break-words text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      Strategies
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="text-base font-semibold tracking-tight text-foreground">
                      {formatCompactNumber(strategy.user?.stats?.backtestCount)}
                    </p>
                    <p className="break-words text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      Backtests
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 md:grid-cols-2 md:items-start">
            <RulePanel
              title="Buy Entry"
              block={strategy.entry?.buy}
              tone="buy"
            />
            <RulePanel
              title="Sell Entry"
              block={strategy.entry?.sell}
              tone="sell"
            />
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-3 lg:items-start">
            <Card className="min-w-0 overflow-hidden border-border/70 lg:col-span-3">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Indicators
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  {(strategy.indicators?.length ?? 0) === 0
                    ? "No indicators used in this setup."
                    : `${strategy.indicators?.length ?? 0} ${
                        (strategy.indicators?.length ?? 0) === 1
                          ? "indicator"
                          : "indicators"
                      } used in this setup.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {strategy.indicators?.length ? (
                  <div className="divide-y divide-border/60">
                    {strategy.indicators.map((indicator, index) => {
                      const params = formatIndicatorParams(
                        indicator.params,
                      ).slice(0, 2);
                      return (
                        <div
                          key={`${indicator.key ?? indicator.indicator?._id ?? index}`}
                          className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between md:gap-6"
                        >
                          <div className="min-w-0 md:flex-1">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className="shrink-0 text-sm leading-5 font-semibold text-muted-foreground">
                                {index + 1}.
                              </span>
                              <p className="line-clamp-2 text-sm leading-5 font-semibold text-foreground">
                                {indicator.indicator?.name ||
                                  indicator.key ||
                                  "Indicator"}
                              </p>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {indicator.indicator?.description ||
                                "Custom signal"}
                            </p>
                          </div>

                          <div className="space-y-1 text-sm md:w-[240px] md:flex-none md:text-right">
                            <p className="text-xs text-muted-foreground">
                              Key:{" "}
                              <span className="font-medium text-foreground">
                                {indicator.key || "Not set"}
                              </span>
                            </p>
                            {params.length ? (
                              <div className="text-xs text-muted-foreground md:ml-auto md:max-w-[240px]">
                                {params.map(
                                  ([paramKey, paramValue], paramIndex) => (
                                    <span key={paramKey}>
                                      {paramIndex > 0 ? " · " : ""}
                                      <span className="font-medium text-muted-foreground">
                                        {paramKey}
                                      </span>
                                      :{" "}
                                      <span className="font-medium text-foreground">
                                        {String(paramValue)}
                                      </span>
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No parameters
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-sm text-muted-foreground">
                    No indicators used in this strategy.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-primary">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Test before trading live
                  </p>
                  <p className="mt-1 max-w-2xl">
                    Run this strategy against historical market data before
                    using it live. Results can change by symbol, timeframe, and
                    date range.
                  </p>
                </div>
              </div>
              <div className="ml-auto flex w-full flex-wrap gap-2 md:w-auto">
                <Button
                  type="button"
                  asChild
                  className="w-full md:min-w-40 md:w-auto"
                >
                  <Link to="/backtest" state={backtestStrategyState}>
                    Run Backtest
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={isUnfollowDialogOpen}
        onOpenChange={setIsUnfollowDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfollow this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You can follow this user again anytime from their profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFollowUpdating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isFollowUpdating}
              className="relative !bg-destructive !text-white hover:!bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void onToggleCreatorFollow().finally(() => {
                  setIsUnfollowDialogOpen(false);
                });
              }}
            >
              {isFollowUpdating ? (
                <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
              ) : null}
              <span className={isFollowUpdating ? "opacity-0" : undefined}>
                Unfollow
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteConfirmOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete strategy permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The strategy will be removed
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="relative !bg-destructive !text-white hover:!bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void onDeleteStrategy();
              }}
            >
              {isDeleting ? (
                <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
              ) : null}
              <span className={isDeleting ? "opacity-0" : undefined}>
                Delete
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
