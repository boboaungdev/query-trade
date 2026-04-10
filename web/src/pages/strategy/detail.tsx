import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  Copy,
  CopyPlus,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Radar,
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
import { createFollow, deleteFollow, fetchFollowStatus } from "@/api/follow";
import { deleteStrategy, fetchStrategyById } from "@/api/strategy";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

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
  createdAt?: string;
  updatedAt?: string;
  user?: {
    _id?: string;
    name?: string;
    username?: string;
    avatar?: string;
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
    indicator?: { _id?: string; name?: string; category?: string };
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

function formatStopLoss(stopLoss?: Record<string, unknown>) {
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
        return `${candleLabel} (${aggregation})`;
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
    case "candle":
      return `Candle ${String(takeProfit.reference ?? "")} ${String(takeProfit.price ?? "")}`.trim();
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

function LogicWord({ logic }: { logic: "and" | "or" }) {
  return (
    <span
      className={cn(
        "mx-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
        logic === "and" ? "bg-info/10 text-info" : "bg-warning/10 text-warning",
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
          tone === "buy"
            ? "border-success/15 bg-success/5"
            : "border-warning/15 bg-warning/5",
        )}
      >
        {node.conditions.map((child, index) => (
          <span
            key={`${formatConditionNodeSummary(child)}-${index}`}
            className="inline-flex flex-wrap items-center"
          >
            {index > 0 ? <LogicWord logic={node.logic} /> : null}
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
        "inline-flex flex-wrap items-center rounded-2xl border px-2 py-1 text-xs leading-5 font-medium",
        tone === "buy"
          ? "border-success/15 bg-success/5"
          : "border-warning/15 bg-warning/5",
      )}
    >
      <span className="break-all">{formatOperand(node.left)}</span>
      <span
        className={cn(
          "mx-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 py-0.5 text-center text-[10px] leading-none font-semibold",
          tone === "buy"
            ? "bg-success/12 text-success"
            : "bg-warning/12 text-warning",
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
    <div
      className={cn(
        "w-full rounded-xl border px-2.5 py-2 sm:w-auto sm:max-w-[14rem] sm:min-w-[11rem]",
        variant === "stopLoss"
          ? "border-destructive/20 bg-destructive/8"
          : "border-info/20 bg-info/8",
      )}
    >
      <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm leading-5 font-medium text-foreground">
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
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-4 sm:p-5",
        isBuy ? "theme-rule-panel-buy" : "theme-rule-panel-sell",
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
                  : "border-warning/20 bg-warning/10 text-warning",
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
              {ruleCount === 1 ? "1 rule" : `${ruleCount} rules`}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isBuy
              ? "Conditions used to open long positions."
              : "Conditions used to open short positions."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/15 px-3 py-3">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Rules
          </p>
          {rules.length ? (
            <div className="mt-2.5 text-left leading-7">
              {rules.map((node, index) => (
                <span
                  key={`${formatConditionNodeSummary(node)}-${index}`}
                  className="inline-flex flex-wrap items-center"
                >
                  {index > 0 ? (
                    <LogicWord logic={block?.logic ?? "and"} />
                  ) : null}
                  <RuleExpression node={node} tone={tone} />
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">
              No rules available.
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <RiskTile
            label="Stop Loss"
            value={formatStopLoss(block?.riskManagement?.stopLoss)}
            variant="stopLoss"
          />
          <RiskTile
            label="Take Profit"
            value={formatTakeProfit(block?.riskManagement?.takeProfit)}
            variant="takeProfit"
          />
        </div>
      </div>
    </section>
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
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(false);
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);
  const [isStrategyBookmarkUpdating, setIsStrategyBookmarkUpdating] =
    useState(false);
  const creatorUserId = strategy?.user?._id ?? "";
  const isMine = Boolean(user?._id) && creatorUserId === user?._id;

  useEffect(() => {
    if (!strategyId) {
      setStrategy(null);
      setIsFollowingCreator(false);
      setIsFollowStatusLoading(false);
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
      setIsFollowStatusLoading(false);
      setIsStrategyBookmarkUpdating(false);

      try {
        const nextStrategy = await loadStrategyDetailOnce(strategyId);

        if (!nextStrategy) throw new Error("Strategy not found");

        const creatorId = nextStrategy.user?._id ?? "";
        const shouldLoadFollowStatus =
          isAuthenticated && Boolean(creatorId) && creatorId !== user?._id;

        const followStatusPromise = shouldLoadFollowStatus
          ? fetchFollowStatus(creatorId)
          : Promise.resolve(null);

        if (shouldLoadFollowStatus) {
          setIsFollowStatusLoading(true);
        }

        const followStatusResponse = await followStatusPromise;

        if (!isActive) return;

        setStrategy(nextStrategy);
        setIsFollowingCreator(
          shouldLoadFollowStatus
            ? Boolean(followStatusResponse?.result?.isFollowing)
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
          setIsFollowStatusLoading(false);
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

  const creatorUsername = strategy?.user?.username?.trim().replace(/^@/, "");
  const canOpenCreatorProfile = Boolean(creatorUsername);
  const isBookmarked = Boolean(strategy?.isBookmarked);
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

    navigate("/strategy/create", {
      state: {
        duplicateStrategyId: strategy._id,
        duplicateStrategyName: strategy.name,
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
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Card className="text-foreground">
        <CardContent className="space-y-5 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className=""
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
                  variant={isBookmarked ? "outline" : "default"}
                  size="icon-sm"
                  className="rounded-r-none"
                  aria-label={isBookmarked ? "Bookmarked" : "Bookmark"}
                  title={isBookmarked ? "Bookmarked" : "Bookmark"}
                  disabled={isStrategyBookmarkUpdating}
                  onClick={() => {
                    void onToggleBookmark();
                  }}
                >
                  {isStrategyBookmarkUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant={isBookmarked ? "outline" : "default"}
                      size="icon-sm"
                      className="-ml-px rounded-l-none"
                      aria-label="More actions"
                      title="More actions"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 min-w-44">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/backtest"
                        state={{
                          strategyId: strategy._id,
                          strategyName: strategy.name,
                        }}
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
                        <DropdownMenuItem asChild>
                          <Link
                            to={`/strategy/${strategy._id}/edit`}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
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
            <div className="rounded-xl border bg-muted/30 px-4 py-8 text-sm text-muted-foreground">
              {loadError || "Strategy not found."}
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground uppercase">
                  Strategy Detail
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground uppercase">
                  {strategy.isPublic ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {isMine ? "Mine" : strategy.isPublic ? "Public" : "Private"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <UserRound className="h-3 w-3" />@
                  {strategy.user?.username || "unknown"}
                </span>
              </div>

              <div>
                <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {strategy.name}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {strategy.description?.trim() ||
                    "A polished breakdown of the setup, its signal stack, and the risk controls used on both sides of the strategy."}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Last updated{" "}
                    <span className="font-medium text-foreground">
                      {formatDateLabel(strategy.updatedAt)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && strategy ? (
        <div className="space-y-5">
          <Card className="theme-creator-card overflow-hidden rounded-[24px] border shadow-sm">
            <CardContent className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4 text-primary" />
                Creator
              </CardTitle>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="default">
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
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold tracking-tight text-foreground">
                        {strategy.user?.name?.trim() ||
                          strategy.user?.username ||
                          "Unknown"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        @{strategy.user?.username || "unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center md:min-w-[280px]">
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {formatCompactNumber(
                          strategy.user?.stats?.followerCount,
                        )}
                      </p>
                      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                        Followers
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {formatCompactNumber(
                          strategy.user?.stats?.strategyCount,
                        )}
                      </p>
                      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                        Strategies
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {formatCompactNumber(
                          strategy.user?.stats?.backtestCount,
                        )}
                      </p>
                      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                        Backtests
                      </p>
                    </div>
                  </div>
                </div>
                {!isMine ? (
                  <ButtonGroup className="w-full md:w-auto">
                    <Button
                      type="button"
                      variant={isFollowingCreator ? "outline" : "default"}
                      className="min-w-0 flex-1 rounded-r-none"
                      disabled={
                        !isAuthenticated ||
                        isFollowUpdating ||
                        isFollowStatusLoading
                      }
                      onClick={() => {
                        if (isFollowingCreator) {
                          setIsUnfollowDialogOpen(true);
                          return;
                        }

                        void onToggleCreatorFollow();
                      }}
                    >
                      {isFollowUpdating || isFollowStatusLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFollowingCreator ? (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Follow
                        </>
                      )}
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
                          disabled={
                            !isAuthenticated ||
                            isFollowUpdating ||
                            isFollowStatusLoading
                          }
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
            </CardContent>
          </Card>

          <RulePanel
            title="Buy Strategy"
            block={strategy.entry?.buy}
            tone="buy"
          />
          <RulePanel
            title="Sell Strategy"
            block={strategy.entry?.sell}
            tone="sell"
          />

          <div className="grid gap-5 xl:grid-cols-3 xl:items-start">
            <Card className="theme-primary-card overflow-hidden rounded-[24px] shadow-sm xl:col-span-3">
              <CardHeader className="theme-primary-card-header space-y-2 px-4 pt-2 pb-1.5 sm:px-5 sm:pt-3 sm:pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="theme-primary-card-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] uppercase">
                    <Radar className="h-3 w-3" />
                    Indicator Stack
                  </span>
                  <span className="theme-primary-card-badge-muted rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] uppercase">
                    {strategy.indicators?.length ?? 0}{" "}
                    {(strategy.indicators?.length ?? 0) === 1
                      ? "indicator"
                      : "indicators"}
                  </span>
                </div>
                <CardDescription className="theme-primary-card-description max-w-2xl text-sm leading-6">
                  Signal inputs used in this setup.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-1.5 pb-3 sm:px-5 sm:pt-2 sm:pb-4">
                {strategy.indicators?.length ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                    {strategy.indicators.map((indicator, index) => {
                      const params = formatIndicatorParams(
                        indicator.params,
                      ).slice(0, 2);
                      return (
                        <div
                          key={`${indicator.key ?? indicator.indicator?._id ?? index}`}
                          className="theme-primary-card-item min-w-0 rounded-lg border p-2"
                        >
                          <div className="flex min-h-[5.25rem] flex-col">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm leading-5 font-semibold text-foreground">
                                {indicator.indicator?.name ||
                                  indicator.key ||
                                  "Indicator"}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {indicator.indicator?.category ||
                                  "Custom signal"}
                              </p>
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground">
                              Key: {indicator.key || "Not set"}
                            </div>

                            <div className="mt-1 flex flex-wrap content-start gap-1 overflow-hidden">
                              {params.length
                                ? params.map(([paramKey, paramValue]) => (
                                    <span
                                      key={paramKey}
                                      className="theme-primary-card-tag inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px]"
                                    >
                                      {paramKey}: {String(paramValue)}
                                    </span>
                                  ))
                                : null}
                            </div>
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

          <Card className="overflow-hidden rounded-[24px] border shadow-sm">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/30 text-primary">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Validate this strategy before live execution
                  </p>
                  <p className="mt-1 max-w-2xl">
                    Backtest this setup first. Results can vary across symbols,
                    timeframes, and market conditions, so double-check the rule
                    flow and risk settings before going live.
                  </p>
                </div>
              </div>
              <div className="ml-auto flex w-full flex-wrap gap-2 sm:w-auto">
                <Button
                  type="button"
                  asChild
                  className="w-full min-w-[132px] sm:w-auto"
                >
                  <Link
                    to="/backtest"
                    state={{
                      strategyId: strategy._id,
                      strategyName: strategy.name,
                    }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <CandlestickChart className="h-4 w-4" />
                    Backtest
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
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
              disabled={isFollowUpdating}
              onClick={(event) => {
                event.preventDefault();
                void onToggleCreatorFollow().finally(() => {
                  setIsUnfollowDialogOpen(false);
                });
              }}
            >
              {isFollowUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Unfollowing...
                </>
              ) : (
                "Unfollow"
              )}
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
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void onDeleteStrategy();
              }}
            >
              {isDeleting ? (
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
  );
}
