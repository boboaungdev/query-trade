import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  CandlestickChart,
  Check,
  ChevronDown,
  Copy,
  Gauge,
  Globe,
  ImagePlus,
  ListFilter,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Search,
  SearchX,
  ShieldAlert,
  AtSign,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserRound,
  X,
  XCircle,
  type LucideIcon,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import { createFollow, deleteFollow } from "@/api/follow";
import {
  fetchUserBacktestsByUsername,
  fetchUserFollowsByUsername,
  fetchUserStrategiesByUsername,
  fetchUserByUsername,
} from "@/api/user";
import { createBookmark, deleteBookmark } from "@/api/bookmark";
import { useAuthStore } from "@/store/auth";
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
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkUserExist, editProfile } from "@/api/auth";
import {
  getUserAvatarRingClass,
  UserMembershipMark,
  type UserMembership,
} from "@/components/user-membership";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const NAME_REGEX = /^[A-Za-z0-9 ]{1,20}$/;
const USERNAME_REGEX = /^[a-z0-9]{6,20}$/;
const NAME_WORD_LIMIT = 3;

function sanitizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitizeName(value: string) {
  return value
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
}

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type FormState = {
  name: string;
  username: string;
  avatar: string;
  bio: string;
};

type PublicProfileUser = {
  _id?: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  createdAt?: string;
  stats?: {
    followerCount?: number;
    followingCount?: number;
    strategyCount?: number;
    backtestCount?: number;
  };
  isFollowing?: boolean;
  membership?: {
    plan?: UserMembership["plan"];
    badgeLabel?: UserMembership["badgeLabel"];
    badgeVariant?: UserMembership["badgeVariant"];
    verifiedVariant?: UserMembership["verifiedVariant"];
    title?: UserMembership["title"];
    description?: UserMembership["description"];
  };
};

type PublicProfileResponse = {
  result?: {
    user?: PublicProfileUser;
  };
};

type ProfileDialogTab = "followers" | "following" | "strategies" | "backtests";
type ProfileUsernameStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

type ProfileFollowListItem = {
  _id: string;
  name?: string;
  username?: string;
  avatar?: string;
  membership?: PublicProfileUser["membership"];
  stats?: {
    followerCount?: number;
    followingCount?: number;
    strategyCount?: number;
    backtestCount?: number;
  };
  isFollowing?: boolean;
};

type ProfileStrategyListItem = {
  _id: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    viewCount?: number;
    bookmarkCount?: number;
  };
  isBookmarked?: boolean;
};

type ProfileBacktestListItem = {
  _id: string;
  symbol?: string;
  timeframe?: string;
  createdAt?: string;
  isBookmarked?: boolean;
  strategy?: {
    name?: string;
  };
  result?: {
    roi?: number;
    totalTrades?: number;
    winRate?: number;
    profitFactor?: number;
    maxDrawdownPercent?: number;
  };
};

type ProfileListState = {
  items: Array<
    ProfileFollowListItem | ProfileStrategyListItem | ProfileBacktestListItem
  >;
  total: number;
  page: number;
  hasNextPage: boolean;
  isLoading: boolean;
  isSearching: boolean;
  isAppending: boolean;
  error: string;
  search: string;
  debouncedSearch: string;
  sortBy: string;
  order: "asc" | "desc";
};

const defaultProfileListState = (
  sortBy: string,
  order: "asc" | "desc",
): ProfileListState => ({
  items: [],
  total: 0,
  page: 1,
  hasNextPage: false,
  isLoading: false,
  isSearching: false,
  isAppending: false,
  error: "",
  search: "",
  debouncedSearch: "",
  sortBy,
  order,
});

const dialogTabLabels: Record<ProfileDialogTab, string> = {
  followers: "Followers",
  following: "Following",
  strategies: "Strategies",
  backtests: "Backtests",
};

const dialogTabIcons: Record<ProfileDialogTab, LucideIcon> = {
  followers: Users,
  following: UserCheck,
  strategies: Target,
  backtests: CandlestickChart,
};

const backtestSortDefaultOrder: Record<string, "asc" | "desc"> = {
  maxDrawdownPercent: "asc",
  profitFactor: "desc",
  roi: "desc",
  updatedAt: "desc",
  winRate: "desc",
};

const strategySortDefaultOrder: Record<string, "asc" | "desc"> = {
  name: "asc",
  popular: "desc",
  updatedAt: "desc",
};

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatSignedPercent(value?: number) {
  const numericValue = value ?? 0;
  return `${numericValue >= 0 ? "+" : ""}${ratio.format(numericValue)}%`;
}

function getProfileBacktestSummaryMetrics(item: ProfileBacktestListItem) {
  const roiValue = item.result?.roi ?? 0;

  return [
    {
      key: "roi",
      icon: roiValue >= 0 ? TrendingUp : TrendingDown,
      value: formatSignedPercent(roiValue),
      valueClassName: roiValue >= 0 ? "text-emerald-600" : "text-destructive",
    },
    {
      key: "winRate",
      icon: Target,
      value: `${ratio.format(item.result?.winRate ?? 0)}%`,
      valueClassName: "text-foreground",
    },
    {
      key: "maxDrawdownPercent",
      icon: ShieldAlert,
      value: `${ratio.format(item.result?.maxDrawdownPercent ?? 0)}%`,
      valueClassName: "text-foreground",
    },
    {
      key: "profitFactor",
      icon: Gauge,
      value: ratio.format(item.result?.profitFactor ?? 0),
      valueClassName: "text-foreground",
    },
  ];
}

export default function Profile() {
  const { username: routeUsernameParam = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [updatingStrategyIds, setUpdatingStrategyIds] = useState<Set<string>>(
    new Set(),
  );
  const [updatingBacktestIds, setUpdatingBacktestIds] = useState<Set<string>>(
    new Set(),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsernameInvalid, setIsUsernameInvalid] = useState(false);
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [usernameStatus, setUsernameStatus] =
    useState<ProfileUsernameStatus>("idle");
  const [viewedUser, setViewedUser] = useState<PublicProfileUser | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState("");
  const [selectedAvatarFileName, setSelectedAvatarFileName] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(false);
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false);
  const [pendingFollowListUnfollowUser, setPendingFollowListUnfollowUser] =
    useState<ProfileFollowListItem | null>(null);
  const [followListUpdatingIds, setFollowListUpdatingIds] = useState<
    Set<string>
  >(new Set());
  const [activeProfileTab, setActiveProfileTab] =
    useState<ProfileDialogTab>("followers");
  const [profileLists, setProfileLists] = useState<
    Record<ProfileDialogTab, ProfileListState>
  >({
    followers: defaultProfileListState("name", "asc"),
    following: defaultProfileListState("name", "asc"),
    strategies: defaultProfileListState("name", "asc"),
    backtests: defaultProfileListState("roi", "desc"),
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const profileListScrollRef = useRef<HTMLDivElement | null>(null);
  const profileListLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const editSheetBodyRef = useRef<HTMLDivElement | null>(null);
  const usernameRequestIdRef = useRef(0);
  const editSheetDragPointerIdRef = useRef<number | null>(null);
  const editSheetDragStartYRef = useRef(0);
  const editSheetDragLastYRef = useRef(0);
  const editSheetDragSourceRef = useRef<"handle" | "body" | null>(null);
  const editSheetDragResetTimerRef = useRef<number | null>(null);
  const editSheetSwipeCloseTimerRef = useRef<number | null>(null);
  const isMobile = useIsMobile();
  const [editSheetDragOffset, setEditSheetDragOffset] = useState(0);
  const [isEditSheetDragging, setIsEditSheetDragging] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: user?.name || "",
    username: user?.username || "",
    avatar: user?.avatar || "",
    bio: user?.bio || "",
  });

  const routeUsername = routeUsernameParam.toLowerCase();
  const isOwnProfileRoute =
    Boolean(user?.username) &&
    Boolean(routeUsername) &&
    routeUsername === user?.username?.toLowerCase();
  const canEditProfile = Boolean(user) && isOwnProfileRoute;
  const currentProfileDialogUrl = location.pathname;
  const profileListRequestIdRef = useRef<Record<ProfileDialogTab, number>>({
    followers: 0,
    following: 0,
    strategies: 0,
    backtests: 0,
  });
  const previousProfileListSearchRef = useRef<Record<ProfileDialogTab, string>>(
    {
      followers: "",
      following: "",
      strategies: "",
      backtests: "",
    },
  );

  const initials =
    (canEditProfile ? form.name || user?.name : viewedUser?.name)
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const hasChanged = useMemo(() => {
    if (!user) return false;

    return (
      form.name.trim() !== user.name ||
      form.username.trim() !== user.username ||
      (form.avatar.trim() || "") !== (user.avatar || "") ||
      form.bio.trim() !== (user.bio || "")
    );
  }, [form, user]);

  const trimmedName = form.name.trim();
  const trimmedUsername = form.username.trim();
  const nameWordCount = trimmedName ? trimmedName.split(/\s+/).length : 0;
  const validName =
    NAME_REGEX.test(trimmedName) && nameWordCount <= NAME_WORD_LIMIT;
  const validUsername = USERNAME_REGEX.test(trimmedUsername);
  const isUsernameChanged = trimmedUsername !== (user?.username ?? "");
  const isUsernameSearchPending =
    isEditing &&
    validUsername &&
    isUsernameChanged &&
    trimmedUsername.length > 0 &&
    trimmedUsername !== debouncedUsername;
  const isUsernameLiveInvalid =
    isUsernameInvalid ||
    usernameStatus === "invalid" ||
    usernameStatus === "unavailable" ||
    usernameStatus === "error";
  const usernameHelperText =
    isUsernameInvalid || usernameStatus === "unavailable"
      ? "Username is not available"
      : usernameStatus === "invalid"
        ? "Username must be 6-20 characters"
        : usernameStatus === "checking" || isUsernameSearchPending
          ? "Checking username availability..."
          : usernameStatus === "error"
            ? "Unable to check username right now"
            : "";
  const nameHelperText =
    trimmedName.length === 0
      ? ""
      : nameWordCount > NAME_WORD_LIMIT
        ? `Name can use up to ${NAME_WORD_LIMIT} words`
        : !NAME_REGEX.test(trimmedName)
          ? "Name must be 1-20 chars: letters, numbers, and spaces only"
          : "";

  const isFormValid = useMemo(() => {
    if (!user) return false;

    const nextName = trimmedName;
    const nextUsername = trimmedUsername;
    const isNameChanged = nextName !== user.name;
    const usernameDidChange = nextUsername !== user.username;

    if (isNameChanged && !validName) return false;
    if (
      usernameDidChange &&
      (!validUsername || usernameStatus !== "available")
    ) {
      return false;
    }

    return true;
  }, [
    trimmedName,
    trimmedUsername,
    user,
    validName,
    validUsername,
    usernameStatus,
  ]);

  useEffect(() => {
    if (!isEditing || !user) {
      setDebouncedUsername("");
      setUsernameStatus("idle");
      return;
    }

    if (!trimmedUsername || trimmedUsername === user.username) {
      setDebouncedUsername("");
      setUsernameStatus("idle");
      return;
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setDebouncedUsername("");
      setUsernameStatus("invalid");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedUsername(trimmedUsername);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isEditing, trimmedUsername, user]);

  useEffect(() => {
    if (!isEditing || !user || !debouncedUsername) return;
    if (debouncedUsername === user.username) return;
    if (debouncedUsername !== trimmedUsername) return;

    const requestId = usernameRequestIdRef.current + 1;
    usernameRequestIdRef.current = requestId;
    setUsernameStatus("checking");

    checkUserExist({ username: debouncedUsername })
      .then((data) => {
        if (usernameRequestIdRef.current !== requestId) return;

        setUsernameStatus(data?.result?.exist ? "unavailable" : "available");
      })
      .catch(() => {
        if (usernameRequestIdRef.current !== requestId) return;

        setUsernameStatus("error");
      });
  }, [debouncedUsername, isEditing, trimmedUsername, user]);

  useEffect(() => {
    let isActive = true;

    if (!routeUsername) {
      setViewedUser(null);
      setIsFollowing(false);
      setProfileLoadError("");
      setIsProfileLoading(false);
      setIsFollowStatusLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadUserProfile = async () => {
      setIsProfileLoading(true);
      setIsFollowStatusLoading(isAuthenticated && !canEditProfile);
      setProfileLoadError("");

      try {
        const response = (await fetchUserByUsername(
          routeUsername,
        )) as PublicProfileResponse;

        if (!isActive) return;

        const nextUser = response?.result?.user ?? null;

        if (!nextUser?._id) {
          setProfileLoadError("User not found.");
          setViewedUser(null);
          setIsFollowing(false);
          return;
        }

        const nextIsFollowing =
          isAuthenticated && !canEditProfile
            ? Boolean(nextUser.isFollowing)
            : false;

        setViewedUser(nextUser);
        setIsFollowing(nextIsFollowing);

        if (
          canEditProfile &&
          user &&
          (user.name !== (nextUser.name ?? user.name) ||
            user.username !== (nextUser.username ?? user.username) ||
            (user.avatar || "") !== (nextUser.avatar || "") ||
            (user.bio || "") !== (nextUser.bio || "") ||
            JSON.stringify(user.stats ?? {}) !==
              JSON.stringify(nextUser.stats ?? {}))
        ) {
          updateUser({
            name: nextUser.name ?? user.name,
            username: nextUser.username ?? user.username,
            avatar: nextUser.avatar || undefined,
            bio: nextUser.bio ?? user.bio,
            stats: nextUser.stats ?? user.stats,
          });
        }
      } catch (error) {
        if (!isActive) return;
        const message =
          typeof error === "object" && error !== null
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : undefined;
        setProfileLoadError(message || "Failed to load user profile.");
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
          setIsFollowStatusLoading(false);
        }
      }
    };

    void loadUserProfile();

    return () => {
      isActive = false;
    };
  }, [canEditProfile, isAuthenticated, routeUsername, updateUser, user]);

  useEffect(() => {
    const timers = (Object.keys(profileLists) as Array<ProfileDialogTab>).map(
      (tab) =>
        setTimeout(() => {
          setProfileLists((prev) => {
            const nextSearch = prev[tab].search.trim();
            if (prev[tab].debouncedSearch === nextSearch) {
              return prev;
            }

            return {
              ...prev,
              [tab]: {
                ...prev[tab],
                debouncedSearch: nextSearch,
                page: 1,
              },
            };
          });
        }, 350),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [profileLists]);

  const activeListState = profileLists[activeProfileTab];
  const activeListPage = activeListState.page;
  const activeListSearch = activeListState.debouncedSearch;
  const activeListSortBy = activeListState.sortBy;
  const activeListOrder = activeListState.order;
  const currentUserId = user?._id;

  useEffect(() => {
    if (!routeUsername) return;

    const tab = activeProfileTab;
    const requestId = profileListRequestIdRef.current[tab] + 1;
    profileListRequestIdRef.current[tab] = requestId;
    const isSearchTriggeredFetch =
      activeListSearch !== previousProfileListSearchRef.current[tab];

    setProfileLists((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        error: "",
        isLoading: prev[tab].page === 1 && !isSearchTriggeredFetch,
        isSearching: prev[tab].page === 1 && isSearchTriggeredFetch,
        isAppending: prev[tab].page > 1,
      },
    }));

    const load = async () => {
      try {
        let result:
          | {
              result?: {
                items?: Array<
                  | ProfileFollowListItem
                  | ProfileStrategyListItem
                  | ProfileBacktestListItem
                >;
                total?: number;
                hasNextPage?: boolean;
              };
            }
          | undefined;

        if (tab === "followers" || tab === "following") {
          result = await fetchUserFollowsByUsername(routeUsername, {
            type: tab,
            page: activeListPage,
            search: activeListSearch,
            sortBy: activeListSortBy,
            order: activeListOrder,
          });
        } else if (tab === "strategies") {
          result = await fetchUserStrategiesByUsername(routeUsername, {
            page: activeListPage,
            search: activeListSearch,
            sortBy: activeListSortBy,
            order: activeListOrder,
          });
        } else {
          result = await fetchUserBacktestsByUsername(routeUsername, {
            page: activeListPage,
            search: activeListSearch,
            sortBy: activeListSortBy,
            order: activeListOrder,
          });
        }

        if (profileListRequestIdRef.current[tab] !== requestId) return;

        const nextItems = result?.result?.items ?? [];

        setProfileLists((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            items:
              prev[tab].page === 1
                ? nextItems
                : [
                    ...prev[tab].items,
                    ...nextItems.filter(
                      (item) =>
                        !prev[tab].items.some(
                          (existing) => existing._id === item._id,
                        ),
                    ),
                  ],
            total: result?.result?.total ?? 0,
            hasNextPage: Boolean(result?.result?.hasNextPage),
            isLoading: false,
            isSearching: false,
            isAppending: false,
            error: "",
          },
        }));
        previousProfileListSearchRef.current[tab] = activeListSearch;
      } catch (error) {
        if (profileListRequestIdRef.current[tab] !== requestId) return;

        setProfileLists((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            isLoading: false,
            isSearching: false,
            isAppending: false,
            error: getApiErrorMessage(error, "Failed to load items"),
          },
        }));
      }
    };

    void load();
  }, [
    activeListOrder,
    activeListPage,
    activeListSearch,
    activeListSortBy,
    activeProfileTab,
    currentUserId,
    routeUsername,
    isAuthenticated,
  ]);

  useEffect(() => {
    const node = profileListLoadMoreRef.current;
    const root = profileListScrollRef.current?.querySelector<HTMLDivElement>(
      "[data-slot='scroll-area-viewport']",
    );

    if (
      !node ||
      !root ||
      !activeListState.hasNextPage ||
      activeListState.isLoading ||
      activeListState.isAppending ||
      activeListState.isSearching ||
      activeListState.search.trim() !== activeListState.debouncedSearch
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (
          firstEntry?.isIntersecting &&
          !activeListState.isSearching &&
          activeListState.search.trim() === activeListState.debouncedSearch
        ) {
          updateProfileListState(activeProfileTab, (state) => ({
            ...state,
            page: state.page + 1,
          }));
        }
      },
      {
        root,
        rootMargin: "220px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    activeListState.hasNextPage,
    activeListState.isAppending,
    activeListState.isLoading,
    activeListState.isSearching,
    activeListState.search,
    activeListState.debouncedSearch,
    activeProfileTab,
  ]);

  useEffect(() => {
    if (editSheetDragResetTimerRef.current) {
      window.clearTimeout(editSheetDragResetTimerRef.current);
      editSheetDragResetTimerRef.current = null;
    }

    if (isEditing) {
      if (editSheetSwipeCloseTimerRef.current) {
        window.clearTimeout(editSheetSwipeCloseTimerRef.current);
        editSheetSwipeCloseTimerRef.current = null;
      }

      editSheetDragPointerIdRef.current = null;
      editSheetDragSourceRef.current = null;
      setIsEditSheetDragging(false);
      setEditSheetDragOffset(0);
      return;
    }

    editSheetDragPointerIdRef.current = null;
    editSheetDragSourceRef.current = null;
    setIsEditSheetDragging(false);

    editSheetDragResetTimerRef.current = window.setTimeout(() => {
      setEditSheetDragOffset(0);
      editSheetDragResetTimerRef.current = null;
    }, 220);

    return () => {
      if (editSheetDragResetTimerRef.current) {
        window.clearTimeout(editSheetDragResetTimerRef.current);
        editSheetDragResetTimerRef.current = null;
      }
    };
  }, [isEditing]);

  if (!routeUsername && isAuthenticated && user?.username) {
    return <Navigate to={`/${user.username}`} replace />;
  }

  if (!routeUsername && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (
    !canEditProfile &&
    !isProfileLoading &&
    !viewedUser &&
    Boolean(profileLoadError)
  ) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">
            User not found
          </p>
          <p className="text-sm text-muted-foreground">
            {profileLoadError || "This username does not exist."}
          </p>
        </div>
      </div>
    );
  }

  if (!canEditProfile && isProfileLoading) {
    return (
      <div className="mx-auto flex min-h-[220px] w-full max-w-4xl items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Searching profile...
      </div>
    );
  }

  function onCancel() {
    if (!user) return;
    if (editSheetSwipeCloseTimerRef.current) {
      window.clearTimeout(editSheetSwipeCloseTimerRef.current);
      editSheetSwipeCloseTimerRef.current = null;
    }

    setForm({
      name: user.name || "",
      username: user.username || "",
      avatar: user.avatar || "",
      bio: user.bio || "",
    });
    setIsUsernameInvalid(false);
    setDebouncedUsername("");
    setUsernameStatus("idle");
    setSelectedAvatarFileName("");
    setIsEditing(false);
  }

  const onStartEditing = () => {
    if (!user) return;
    if (editSheetSwipeCloseTimerRef.current) {
      window.clearTimeout(editSheetSwipeCloseTimerRef.current);
      editSheetSwipeCloseTimerRef.current = null;
    }
    if (editSheetDragResetTimerRef.current) {
      window.clearTimeout(editSheetDragResetTimerRef.current);
      editSheetDragResetTimerRef.current = null;
    }

    setForm({
      name: user.name || "",
      username: user.username || "",
      avatar: user.avatar || "",
      bio: user.bio || "",
    });
    setIsUsernameInvalid(false);
    setDebouncedUsername("");
    setUsernameStatus("idle");
    setSelectedAvatarFileName("");
    setIsEditing(true);
  };

  const beginEditSheetDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    source: "handle" | "body",
  ) => {
    if (!isMobile || event.pointerType === "mouse") return;
    if (source === "body" && (editSheetBodyRef.current?.scrollTop ?? 0) > 0) {
      return;
    }

    editSheetDragPointerIdRef.current = event.pointerId;
    editSheetDragStartYRef.current = event.clientY;
    editSheetDragLastYRef.current = event.clientY;
    editSheetDragSourceRef.current = source;
    setIsEditSheetDragging(false);
    setEditSheetDragOffset(0);
  };

  const onEditSheetPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isMobile || editSheetDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - editSheetDragStartYRef.current;

    if (deltaY <= 0) {
      if (isEditSheetDragging || editSheetDragOffset > 0) {
        setIsEditSheetDragging(false);
        setEditSheetDragOffset(0);
      }
      return;
    }

    if (
      editSheetDragSourceRef.current === "body" &&
      (editSheetBodyRef.current?.scrollTop ?? 0) > 0
    ) {
      editSheetDragPointerIdRef.current = null;
      editSheetDragSourceRef.current = null;
      setIsEditSheetDragging(false);
      setEditSheetDragOffset(0);
      return;
    }

    editSheetDragLastYRef.current = event.clientY;
    setIsEditSheetDragging(true);
    setEditSheetDragOffset(deltaY);
    event.preventDefault();
  };

  const endEditSheetDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (
      event &&
      editSheetDragPointerIdRef.current !== null &&
      editSheetDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const totalDrag = Math.max(
      0,
      editSheetDragLastYRef.current - editSheetDragStartYRef.current,
    );

    editSheetDragPointerIdRef.current = null;
    editSheetDragSourceRef.current = null;
    setIsEditSheetDragging(false);

    if (totalDrag > 120) {
      setEditSheetDragOffset(
        Math.max(totalDrag, window.innerHeight || totalDrag),
      );

      editSheetSwipeCloseTimerRef.current = window.setTimeout(() => {
        editSheetSwipeCloseTimerRef.current = null;
        onCancel();
      }, 180);
      return;
    }

    setEditSheetDragOffset(0);
  };

  const onAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      setSelectedAvatarFileName("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      setSelectedAvatarFileName("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        avatar: typeof reader.result === "string" ? reader.result : prev.avatar,
      }));
      setSelectedAvatarFileName(file.name);
    };

    reader.onerror = () => {
      toast.error("Failed to read selected image");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const onRemoveSelectedAvatar = () => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      avatar: user.avatar || "",
    }));
    setSelectedAvatarFileName("");
  };

  const onSave = async () => {
    if (!user) return;
    const nextName = form.name.trim();
    const nextUsername = form.username.trim();
    const nextAvatar = form.avatar.trim();
    const nextBio = form.bio.trim();
    const payload: {
      name?: string;
      username?: string;
      avatar?: string;
      bio?: string;
    } = {};

    if (!isFormValid) return;

    if (nextName !== user.name) {
      payload.name = nextName;
    }

    if (nextUsername !== user.username) {
      payload.username = nextUsername;
    }

    if ((nextAvatar || "") !== (user.avatar || "")) {
      payload.avatar = nextAvatar;
    }

    if (nextBio !== (user.bio || "")) {
      payload.bio = nextBio;
    }

    if (Object.keys(payload).length === 0) return;

    setIsSaving(true);
    setIsUsernameInvalid(false);

    const promise = editProfile(payload);

    promise
      .then(() => {
        const nextUsername = payload.username ?? user.username;
        updateUser({
          name: payload.name ?? user.name,
          username: nextUsername,
          avatar:
            payload.avatar !== undefined
              ? payload.avatar || undefined
              : user.avatar,
          bio: payload.bio !== undefined ? payload.bio : user.bio,
        });
        setIsEditing(false);
        navigate(`/${nextUsername}`, { replace: true });
      })
      .catch((error: unknown) => {
        const response = (
          error as {
            response?: { status?: number; data?: { message?: string } };
          }
        ).response;

        if (
          response?.status === 409 ||
          (response?.status === 400 && payload.username !== undefined)
        ) {
          setIsUsernameInvalid(true);
        }

        toast.error(getApiErrorMessage(error, "Failed to update profile!"));
      });

    promise.finally(() => setIsSaving(false));
  };

  const syncFollowStateAcrossLists = (
    targetUserId: string,
    nextIsFollowing: boolean,
  ) => {
    setProfileLists((prev) => {
      const next = { ...prev };

      (["followers", "following"] as const).forEach((tab) => {
        const currentState = next[tab];
        const shouldRemoveFromFollowing =
          canEditProfile && tab === "following" && !nextIsFollowing;
        const hasTargetUser = currentState.items.some(
          (item) => item._id === targetUserId,
        );

        let items = currentState.items.map((item) =>
          item._id === targetUserId
            ? {
                ...(item as ProfileFollowListItem),
                isFollowing: nextIsFollowing,
              }
            : item,
        );

        if (shouldRemoveFromFollowing) {
          items = items.filter((item) => item._id !== targetUserId);
        }

        next[tab] = {
          ...currentState,
          items,
          total:
            shouldRemoveFromFollowing && hasTargetUser
              ? Math.max(0, currentState.total - 1)
              : currentState.total,
        };
      });

      return next;
    });
  };

  const syncViewedUserFollowersList = (nextIsFollowing: boolean) => {
    if (!user?._id || canEditProfile) return;

    updateProfileListState("followers", (state) => {
      const alreadyInList = state.items.some((item) => item._id === user._id);
      const canInjectCurrentUser =
        state.page === 1 &&
        !state.search.trim() &&
        !state.debouncedSearch.trim();

      let items = state.items;

      if (nextIsFollowing) {
        if (!alreadyInList && canInjectCurrentUser) {
          const currentUserListItem: ProfileFollowListItem = {
            _id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            stats: user.stats,
            isFollowing: false,
          };

          items = [currentUserListItem, ...state.items];
        } else if (alreadyInList) {
          items = state.items.map((item) =>
            item._id === user._id
              ? {
                  ...(item as ProfileFollowListItem),
                  name: user.name,
                  username: user.username,
                  avatar: user.avatar,
                  stats: user.stats,
                  isFollowing: false,
                }
              : item,
          );
        }
      } else if (alreadyInList) {
        items = state.items.filter((item) => item._id !== user._id);
      }

      return {
        ...state,
        items,
        total: Math.max(0, state.total + (nextIsFollowing ? 1 : -1)),
      };
    });
  };

  const onToggleFollow = async () => {
    if (!viewedUser?._id || !isAuthenticated) return;

    setIsFollowUpdating(true);
    const nextIsFollowing = !isFollowing;

    try {
      if (isFollowing) {
        await deleteFollow(viewedUser._id);
      } else {
        await createFollow(viewedUser._id);
      }

      setIsFollowing((prev) => !prev);
      syncViewedUserFollowersList(nextIsFollowing);
      syncFollowStateAcrossLists(viewedUser._id, nextIsFollowing);
      setViewedUser((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                followerCount: Math.max(
                  0,
                  (prev.stats?.followerCount ?? 0) + (isFollowing ? -1 : 1),
                ),
              },
            }
          : prev,
      );
      if (user) {
        updateUser({
          stats: {
            ...user.stats,
            followingCount: Math.max(
              0,
              (user.stats?.followingCount ?? 0) + (isFollowing ? -1 : 1),
            ),
          },
        });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update follow status"));
    } finally {
      setIsFollowUpdating(false);
    }
  };

  const onCopyProfileLink = async (usernameOverride?: string) => {
    const username = usernameOverride || viewedUser?.username || routeUsername;
    if (!username || typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${username}`,
      );
      toast.success("Profile link copied.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy profile link"));
    }
  };

  const onCopyAbsoluteLink = async (path: string) => {
    if (typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Link copied.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy link"));
    }
  };

  const onToggleProfileStrategyBookmark = async (strategyId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to bookmark strategies.");
      return;
    }

    const currentStrategy = (
      profileLists.strategies.items as ProfileStrategyListItem[]
    ).find((item) => item._id === strategyId);
    if (!currentStrategy) return;

    const isBookmarked = Boolean(currentStrategy.isBookmarked);
    setUpdatingStrategyIds((prev) => new Set(prev).add(strategyId));

    try {
      if (isBookmarked) {
        const response = await deleteBookmark({
          targetType: "strategy",
          targetId: strategyId,
        });

        setProfileLists((prev) => ({
          ...prev,
          strategies: {
            ...prev.strategies,
            items: prev.strategies.items.map((item) =>
              item._id === strategyId
                ? {
                    ...(item as ProfileStrategyListItem),
                    isBookmarked: false,
                    stats: {
                      ...((item as ProfileStrategyListItem).stats ?? {}),
                      bookmarkCount: Math.max(
                        0,
                        ((item as ProfileStrategyListItem).stats
                          ?.bookmarkCount ?? 0) - 1,
                      ),
                    },
                  }
                : item,
            ),
          },
        }));

        toast.success(response?.message || "Bookmark removed successfully.");
        return;
      }

      const response = await createBookmark({
        targetType: "strategy",
        target: strategyId,
      });

      setProfileLists((prev) => ({
        ...prev,
        strategies: {
          ...prev.strategies,
          items: prev.strategies.items.map((item) =>
            item._id === strategyId
              ? {
                  ...(item as ProfileStrategyListItem),
                  isBookmarked: true,
                  stats: {
                    ...((item as ProfileStrategyListItem).stats ?? {}),
                    bookmarkCount:
                      ((item as ProfileStrategyListItem).stats?.bookmarkCount ??
                        0) + 1,
                  },
                }
              : item,
          ),
        },
      }));

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
        setProfileLists((prev) => ({
          ...prev,
          strategies: {
            ...prev.strategies,
            items: prev.strategies.items.map((item) =>
              item._id === strategyId
                ? {
                    ...(item as ProfileStrategyListItem),
                    isBookmarked: false,
                    stats: {
                      ...((item as ProfileStrategyListItem).stats ?? {}),
                      bookmarkCount: Math.max(
                        0,
                        ((item as ProfileStrategyListItem).stats
                          ?.bookmarkCount ?? 0) - 1,
                      ),
                    },
                  }
                : item,
            ),
          },
        }));

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

  const onToggleProfileBacktestBookmark = async (backtestId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to bookmark backtests.");
      return;
    }

    const currentBacktest = (
      profileLists.backtests.items as ProfileBacktestListItem[]
    ).find((item) => item._id === backtestId);
    if (!currentBacktest) return;

    const isBookmarked = Boolean(currentBacktest.isBookmarked);
    setUpdatingBacktestIds((prev) => new Set(prev).add(backtestId));

    try {
      if (isBookmarked) {
        const response = await deleteBookmark({
          targetType: "backtest",
          targetId: backtestId,
        });

        setProfileLists((prev) => ({
          ...prev,
          backtests: {
            ...prev.backtests,
            items: prev.backtests.items.map((item) =>
              item._id === backtestId
                ? {
                    ...(item as ProfileBacktestListItem),
                    isBookmarked: false,
                  }
                : item,
            ),
          },
        }));

        toast.success(response?.message || "Bookmark removed successfully.");
        return;
      }

      const response = await createBookmark({
        targetType: "backtest",
        target: backtestId,
      });

      setProfileLists((prev) => ({
        ...prev,
        backtests: {
          ...prev.backtests,
          items: prev.backtests.items.map((item) =>
            item._id === backtestId
              ? {
                  ...(item as ProfileBacktestListItem),
                  isBookmarked: true,
                }
              : item,
          ),
        },
      }));

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
        setProfileLists((prev) => ({
          ...prev,
          backtests: {
            ...prev.backtests,
            items: prev.backtests.items.map((item) =>
              item._id === backtestId
                ? {
                    ...(item as ProfileBacktestListItem),
                    isBookmarked: false,
                  }
                : item,
            ),
          },
        }));

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

  const onToggleFollowListUser = async (targetUser: ProfileFollowListItem) => {
    if (!isAuthenticated || !targetUser._id || targetUser._id === user?._id) {
      return;
    }

    const isCurrentlyFollowing = Boolean(targetUser.isFollowing);

    setFollowListUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(targetUser._id);
      return next;
    });

    try {
      if (isCurrentlyFollowing) {
        await deleteFollow(targetUser._id);
      } else {
        await createFollow(targetUser._id);
      }

      syncFollowStateAcrossLists(targetUser._id, !isCurrentlyFollowing);

      if (user) {
        updateUser({
          stats: {
            ...user.stats,
            followingCount: Math.max(
              0,
              (user.stats?.followingCount ?? 0) +
                (isCurrentlyFollowing ? -1 : 1),
            ),
          },
        });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update follow status"));
    } finally {
      setFollowListUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUser._id);
        return next;
      });
    }
  };

  const onFollowListActionClick = (targetUser: ProfileFollowListItem) => {
    if (targetUser.isFollowing) {
      setPendingFollowListUnfollowUser(targetUser);
      return;
    }

    void onToggleFollowListUser(targetUser);
  };

  const onFollowButtonClick = () => {
    if (isFollowing) {
      setIsUnfollowDialogOpen(true);
      return;
    }

    void onToggleFollow();
  };

  const updateProfileListState = (
    tab: ProfileDialogTab,
    updater: (state: ProfileListState) => ProfileListState,
  ) => {
    setProfileLists((prev) => ({
      ...prev,
      [tab]: updater(prev[tab]),
    }));
  };

  const profileStats = canEditProfile
    ? (user?.stats ?? viewedUser?.stats)
    : (viewedUser?.stats ?? user?.stats);
  const statItems = [
    {
      tab: "followers" as const,
      label: "Followers",
      value: profileStats?.followerCount,
      icon: Users,
    },
    {
      tab: "following" as const,
      label: "Following",
      value: profileStats?.followingCount,
      icon: UserCheck,
    },
    {
      tab: "strategies" as const,
      label: "Strategies",
      value: profileStats?.strategyCount,
      icon: Pencil,
    },
    {
      tab: "backtests" as const,
      label: "Backtests",
      value: profileStats?.backtestCount,
      icon: CandlestickChart,
    },
  ];

  const activeSortOptions =
    activeProfileTab === "followers" || activeProfileTab === "following"
      ? [
          { value: "name", label: "Name" },
          { value: "username", label: "Username" },
        ]
      : activeProfileTab === "strategies"
        ? [
            { value: "updatedAt", label: "Last updated" },
            { value: "name", label: "Name" },
            { value: "popular", label: "Popular" },
          ]
        : [
            { value: "updatedAt", label: "Last updated" },
            { value: "maxDrawdownPercent", label: "Max DD %" },
            { value: "profitFactor", label: "Profit Factor" },
            { value: "roi", label: "ROI" },
            { value: "winRate", label: "Win Rate" },
          ];
  const profileDisplayName = canEditProfile
    ? form.name || user?.name || "Unknown"
    : viewedUser?.name || "Unknown";
  const profileDisplayUsername = canEditProfile
    ? form.username || user?.username || routeUsername
    : viewedUser?.username || routeUsername;
  const profileMembership = viewedUser?.membership;
  const profileAvatarRingClass = getUserAvatarRingClass(profileMembership);
  const joinedDateLabel = new Date(
    (canEditProfile ? user?.createdAt : viewedUser?.createdAt) || Date.now(),
  ).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  return (
    <>
      <div className="mx-auto w-full max-w-5xl">
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
          <CardContent className="space-y-4">
            <div>
              <div className="flex flex-col gap-5">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                    Profile Hub
                  </span>
                  <h1 className="text-xl font-medium tracking-tight text-foreground">
                    {canEditProfile ? "Your Profile" : "Public Profile"}
                  </h1>
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex min-w-0 items-center gap-4 md:items-start">
                    <Avatar
                      className={cn(
                        "h-24 w-24 md:h-28 md:w-28",
                        profileAvatarRingClass,
                      )}
                    >
                      <AvatarImage
                        src={
                          canEditProfile
                            ? form.avatar || user?.avatar
                            : viewedUser?.avatar
                        }
                        alt={
                          canEditProfile
                            ? form.name || user?.name
                            : viewedUser?.name || viewedUser?.username || "User"
                        }
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex min-h-24 min-w-0 flex-1 flex-col justify-center space-y-3 md:min-h-28">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="break-words text-xl font-bold tracking-tight text-foreground md:text-2xl">
                            {profileDisplayName}
                          </h2>
                          <UserMembershipMark
                            membership={profileMembership}
                            className="md:size-5"
                            interactive
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <p className="break-all">@{profileDisplayUsername}</p>
                          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
                          <span>Joined {joinedDateLabel}</span>
                        </div>
                      </div>
                      {(
                        canEditProfile ? form.bio || user?.bio : viewedUser?.bio
                      ) ? (
                        <ScrollArea className="h-12 w-full max-w-md">
                          <p
                            className="min-w-0 pr-3 text-sm leading-6 text-muted-foreground"
                            style={{ overflowWrap: "anywhere" }}
                          >
                            {canEditProfile
                              ? form.bio || user?.bio
                              : viewedUser?.bio}
                          </p>
                        </ScrollArea>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                    {canEditProfile ? (
                      <ButtonGroup
                        aria-label="Profile actions"
                        className="w-full min-w-0 md:w-auto"
                      >
                        <Button
                          onClick={onStartEditing}
                          type="button"
                          variant="outline"
                          className="min-w-0 flex-1 rounded-r-none"
                        >
                          Edit Profile
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="-ml-px shrink-0 rounded-l-none"
                              aria-label="More profile actions"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            collisionPadding={16}
                            className="w-44"
                          >
                            <DropdownMenuItem onClick={onStartEditing}>
                              <Pencil className="h-4 w-4" />
                              Edit profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => void onCopyProfileLink()}
                            >
                              <Copy className="h-4 w-4" />
                              Copy link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ButtonGroup>
                    ) : null}

                    {!canEditProfile && viewedUser?._id ? (
                      <ButtonGroup
                        aria-label="Follow actions"
                        className="w-full min-w-0 md:w-auto"
                      >
                        <Button
                          type="button"
                          className="min-w-0 flex-1 rounded-r-none"
                          variant={isFollowing ? "outline" : "default"}
                          disabled={
                            !isAuthenticated ||
                            isFollowUpdating ||
                            isFollowStatusLoading
                          }
                          onClick={onFollowButtonClick}
                        >
                          {isFollowUpdating || isFollowStatusLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isFollowing ? (
                            <>
                              <UserCheck className="h-4 w-4" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              <span>Follow</span>
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant={isFollowing ? "outline" : "default"}
                              className="-ml-px shrink-0 rounded-l-none"
                              aria-label="More follow actions"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            collisionPadding={16}
                            className="w-44"
                          >
                            <DropdownMenuItem
                              onClick={() => void onCopyProfileLink()}
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
                              onClick={() => {
                                if (isFollowing) {
                                  setIsUnfollowDialogOpen(true);
                                  return;
                                }

                                void onToggleFollow();
                              }}
                            >
                              {isFollowing ? (
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
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {statItems.map(({ tab, label, value }) => (
                <div
                  key={tab}
                  className="rounded-xl bg-muted/70 px-4 py-3 text-left"
                >
                  <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {label}
                  </div>
                  <div className="mt-2 text-xl font-bold tracking-tight text-foreground">
                    {typeof value === "number"
                      ? compactNumber.format(value)
                      : "--"}
                  </div>
                </div>
              ))}
            </div>
            {canEditProfile ? (
              <Sheet
                open={isEditing}
                onOpenChange={(open) => {
                  if (!open) {
                    onCancel();
                  }
                }}
              >
                <SheetContent
                  side={isMobile ? "bottom" : "right"}
                  showCloseButton={!isMobile}
                  className={
                    isMobile
                      ? "flex h-auto max-h-[82vh] w-full flex-col overflow-x-hidden rounded-t-2xl p-0"
                      : "w-full md:max-w-md"
                  }
                  onOpenAutoFocus={(event) => {
                    event.preventDefault();
                  }}
                  onPointerMove={onEditSheetPointerMove}
                  onPointerUp={endEditSheetDrag}
                  onPointerCancel={endEditSheetDrag}
                  style={
                    isMobile
                      ? {
                          transform: `translateY(${editSheetDragOffset}px)`,
                          transition: isEditSheetDragging
                            ? "none"
                            : "transform 200ms ease-out",
                        }
                      : undefined
                  }
                >
                  <SheetHeader
                    className={
                      isMobile
                        ? "border-b px-4 py-4 touch-none"
                        : "border-b px-6 py-5"
                    }
                    onPointerDown={
                      isMobile
                        ? (event) => beginEditSheetDrag(event, "handle")
                        : undefined
                    }
                  >
                    {isMobile ? (
                      <div className="-mt-1 mb-3 flex justify-center">
                        <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
                      </div>
                    ) : null}
                    <SheetTitle>Edit Profile</SheetTitle>
                    <SheetDescription>
                      Update your public profile details.
                    </SheetDescription>
                  </SheetHeader>

                  <div
                    ref={editSheetBodyRef}
                    className={
                      isMobile
                        ? "flex-1 overflow-y-auto px-4 py-4"
                        : "flex-1 overflow-y-auto px-6 py-5"
                    }
                    onPointerDown={(event) => beginEditSheetDrag(event, "body")}
                    style={{ touchAction: isMobile ? "pan-y" : undefined }}
                  >
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-muted-foreground">
                            Avatar
                          </Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-14 w-14">
                            <AvatarImage
                              src={form.avatar || user.avatar}
                              alt={form.name || user.name}
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>

                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onAvatarSelect}
                          />
                          <div className="relative w-full md:max-w-[12rem]">
                            <ImagePlus className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              readOnly
                              value={selectedAvatarFileName || "Choose avatar"}
                              disabled={isSaving}
                              className="cursor-pointer pr-10 pl-9 text-sm text-muted-foreground"
                              onClick={() => avatarInputRef.current?.click()}
                            />
                            {selectedAvatarFileName ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                                disabled={isSaving}
                                onClick={onRemoveSelectedAvatar}
                                aria-label="Remove selected avatar"
                                title="Remove selected avatar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label
                            htmlFor="profile-sheet-name"
                            className="text-muted-foreground"
                          >
                            Name
                          </Label>
                        </div>
                        <div className="relative">
                          <UserRound
                            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <Input
                            id="profile-sheet-name"
                            className="pl-9"
                            value={form.name}
                            placeholder="Full name"
                            aria-invalid={Boolean(nameHelperText)}
                            disabled={isSaving}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                name: sanitizeName(event.target.value),
                              }))
                            }
                          />
                        </div>
                        {nameHelperText ? (
                          <p className="text-xs text-destructive">
                            {nameHelperText}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label
                            htmlFor="profile-sheet-username"
                            className="text-muted-foreground"
                          >
                            Username
                          </Label>
                        </div>
                        <div className="space-y-2">
                          <div className="relative">
                            <AtSign
                              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <Input
                              id="profile-sheet-username"
                              className="pl-9 pr-10"
                              value={form.username}
                              placeholder="Username"
                              aria-invalid={isUsernameLiveInvalid}
                              disabled={isSaving}
                              onChange={(event) => {
                                setIsUsernameInvalid(false);
                                setForm((prev) => ({
                                  ...prev,
                                  username: sanitizeUsername(
                                    event.target.value,
                                  ),
                                }));
                              }}
                            />
                            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                              {usernameStatus === "checking" ||
                              isUsernameSearchPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : !isUsernameChanged && validUsername ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : usernameStatus === "available" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : isUsernameLiveInvalid ? (
                                <XCircle className="h-4 w-4 text-destructive" />
                              ) : null}
                            </span>
                          </div>
                          {usernameHelperText ? (
                            <p
                              className={cn(
                                "text-xs",
                                isUsernameLiveInvalid
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {usernameHelperText}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="profile-sheet-bio"
                            className="text-muted-foreground"
                          >
                            Bio
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            {form.bio.length}/50
                          </span>
                        </div>
                        <Textarea
                          id="profile-sheet-bio"
                          className="h-24 field-sizing-fixed resize-none"
                          value={form.bio}
                          maxLength={50}
                          disabled={isSaving}
                          placeholder="Tell people a little about yourself"
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              bio: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <SheetFooter
                    className={
                      isMobile
                        ? "border-t px-4 pt-3 pb-4"
                        : "border-t px-6 pt-4 pb-6"
                    }
                  >
                    <Button
                      onClick={onSave}
                      disabled={
                        !hasChanged ||
                        isSaving ||
                        !isFormValid ||
                        isUsernameInvalid
                      }
                      className="w-full md:w-auto"
                    >
                      {isSaving ? <Loader2 className="animate-spin" /> : "Save"}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ) : null}
            <div>
              <Card className="overflow-hidden border-border/70 bg-transparent shadow-none">
                <CardContent className="p-0">
                  <Tabs
                    value={activeProfileTab}
                    onValueChange={(value) =>
                      setActiveProfileTab(value as ProfileDialogTab)
                    }
                    className="min-h-0 flex-1 gap-0"
                  >
                    <div className="border-b px-4 pt-0 pb-3">
                      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <TabsList
                          variant="line"
                          className="w-full justify-start md:w-auto"
                        >
                          {(
                            Object.keys(
                              dialogTabLabels,
                            ) as Array<ProfileDialogTab>
                          ).map((tab) => {
                            const Icon = dialogTabIcons[tab];
                            const isActive = activeProfileTab === tab;

                            return (
                              <TabsTrigger
                                key={tab}
                                value={tab}
                                disabled={isActive}
                                aria-label={dialogTabLabels[tab]}
                                title={dialogTabLabels[tab]}
                                className="group gap-2 data-[state=active]:cursor-default data-[state=active]:text-primary data-[state=active]:after:bg-primary disabled:pointer-events-none disabled:opacity-100 dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="hidden group-data-[state=active]:inline lg:inline">
                                  {dialogTabLabels[tab]}
                                </span>
                                <span className="sr-only lg:hidden">
                                  {dialogTabLabels[tab]}
                                </span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        <div className="relative min-w-0 w-full md:max-w-[320px] md:flex-1">
                          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={activeListState.search}
                            onChange={(event) =>
                              updateProfileListState(
                                activeProfileTab,
                                (state) => ({
                                  ...state,
                                  search: event.target.value,
                                }),
                              )
                            }
                            placeholder="Search"
                            className="rounded-md border-0 border-b-2 border-foreground/15 bg-muted/60 pr-12 pl-9 focus-visible:border-primary focus-visible:ring-0 dark:bg-input/30"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="absolute top-1/2 right-1 -translate-y-1/2"
                              >
                                <ListFilter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                              {activeSortOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  className="justify-between"
                                  onClick={() =>
                                    updateProfileListState(
                                      activeProfileTab,
                                      (state) => ({
                                        ...state,
                                        sortBy: option.value,
                                        order:
                                          activeProfileTab === "backtests"
                                            ? (backtestSortDefaultOrder[
                                                option.value
                                              ] ?? state.order)
                                            : activeProfileTab === "strategies"
                                              ? (strategySortDefaultOrder[
                                                  option.value
                                                ] ?? state.order)
                                              : state.order,
                                        page: 1,
                                      }),
                                    )
                                  }
                                >
                                  {option.label}
                                  {activeListState.sortBy === option.value ? (
                                    <Check className="h-4 w-4" />
                                  ) : null}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Order</DropdownMenuLabel>
                              {(["asc", "desc"] as const).map((value) => (
                                <DropdownMenuItem
                                  key={value}
                                  className="justify-between"
                                  onClick={() =>
                                    updateProfileListState(
                                      activeProfileTab,
                                      (state) => ({
                                        ...state,
                                        order: value,
                                        page: 1,
                                      }),
                                    )
                                  }
                                >
                                  {value === "asc" ? "Asc" : "Desc"}
                                  {activeListState.order === value ? (
                                    <Check className="h-4 w-4" />
                                  ) : null}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {(
                      Object.keys(dialogTabLabels) as Array<ProfileDialogTab>
                    ).map((tab) => {
                      const tabState = profileLists[tab];
                      const isTabSearchPending =
                        tabState.search.trim() !== tabState.debouncedSearch;
                      const tabStatus =
                        isTabSearchPending || tabState.isSearching
                          ? "searching"
                          : tabState.isLoading
                            ? "loading"
                            : null;

                      return (
                        <TabsContent
                          key={tab}
                          value={tab}
                          className="min-h-0 flex-1 overflow-hidden"
                        >
                          <ScrollArea
                            ref={
                              tab === activeProfileTab
                                ? profileListScrollRef
                                : null
                            }
                            className="h-[720px] min-w-0 px-4 pt-4 pb-4"
                          >
                            {tabStatus === "searching" ? (
                              <div className="flex min-h-16 items-center justify-center py-2 text-sm text-muted-foreground">
                                <Search className="mr-2 h-4 w-4 animate-pulse" />
                                {tab === "following"
                                  ? "Searching following users...."
                                  : tab === "followers"
                                    ? "Searching followers...."
                                    : tab === "strategies"
                                      ? "Searching strategy...."
                                      : "Searching backtests...."}
                              </div>
                            ) : tabStatus === "loading" ? (
                              <div className="flex min-h-16 items-center justify-center py-2 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {tab === "following"
                                  ? "Loading following users...."
                                  : tab === "followers"
                                    ? "Loading followers...."
                                    : tab === "strategies"
                                      ? "Loading strategy...."
                                      : "Loading backtests...."}
                              </div>
                            ) : tabState.error ? (
                              <div className="flex min-h-16 items-center justify-center py-2 text-sm text-destructive">
                                {tabState.error}
                              </div>
                            ) : tabState.items.length === 0 ? (
                              <div className="flex min-h-16 items-center justify-center py-2 text-sm text-muted-foreground">
                                {tab === "following"
                                  ? "No following users found."
                                  : tab === "followers"
                                    ? "No followers found."
                                    : tab === "strategies"
                                      ? "No strategies found."
                                      : "No backtests found."}
                              </div>
                            ) : (
                              <Command
                                shouldFilter={false}
                                className="rounded-none bg-transparent p-0"
                              >
                                <CommandList className="max-h-none overflow-visible px-0 py-0">
                                  <CommandGroup className="space-y-1 p-0">
                                    {tab === "followers" || tab === "following"
                                      ? (
                                          tabState.items as ProfileFollowListItem[]
                                        ).map((item) => (
                                          <CommandItem
                                            key={item._id}
                                            value={`${item.name || ""} ${item.username || ""}`}
                                            className="theme-hover-surface flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted/60 data-[selected=true]:bg-transparent data-[selected=true]:hover:bg-muted/60"
                                          >
                                            <Link
                                              to={`/${item.username}`}
                                              state={{
                                                fromProfileUrl:
                                                  currentProfileDialogUrl,
                                              }}
                                              className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-foreground"
                                            >
                                              <Avatar
                                                className={cn(
                                                  "h-10 w-10",
                                                  getUserAvatarRingClass(
                                                    item.membership,
                                                  ),
                                                )}
                                              >
                                                <AvatarImage
                                                  src={item.avatar}
                                                  alt={
                                                    item.name || item.username
                                                  }
                                                />
                                                <AvatarFallback>
                                                  {(
                                                    item.name ||
                                                    item.username ||
                                                    "U"
                                                  )
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="min-w-0 space-y-1">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                  <p className="truncate font-medium">
                                                    {item.name || "Unknown"}
                                                  </p>
                                                  <UserMembershipMark
                                                    membership={item.membership}
                                                    className="size-3.5"
                                                  />
                                                </div>
                                                <p className="truncate text-xs text-muted-foreground">
                                                  @{item.username || "unknown"}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                  {[
                                                    {
                                                      key: "followers",
                                                      value:
                                                        item.stats
                                                          ?.followerCount,
                                                      icon: Users,
                                                    },
                                                    {
                                                      key: "following",
                                                      value:
                                                        item.stats
                                                          ?.followingCount,
                                                      icon: UserCheck,
                                                    },
                                                    {
                                                      key: "strategies",
                                                      value:
                                                        item.stats
                                                          ?.strategyCount,
                                                      icon: Target,
                                                    },
                                                    {
                                                      key: "backtests",
                                                      value:
                                                        item.stats
                                                          ?.backtestCount,
                                                      icon: CandlestickChart,
                                                    },
                                                  ].map((stat) => (
                                                    <span
                                                      key={stat.key}
                                                      className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5"
                                                    >
                                                      <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                      <span>
                                                        {compactNumber.format(
                                                          stat.value ?? 0,
                                                        )}
                                                      </span>
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            </Link>

                                            {(tab === "followers" ||
                                              tab === "following") &&
                                            item._id !== user?._id ? (
                                              <ButtonGroup
                                                aria-label={`Follow actions for ${item.username || item.name || "user"}`}
                                                className="min-w-0 shrink-0"
                                              >
                                                <Button
                                                  type="button"
                                                  size="icon-sm"
                                                  variant="ghost"
                                                  className={cn(
                                                    "rounded-r-none border-transparent shadow-none",
                                                    item.isFollowing
                                                      ? "text-primary"
                                                      : "text-muted-foreground",
                                                  )}
                                                  disabled={
                                                    !isAuthenticated ||
                                                    followListUpdatingIds.has(
                                                      item._id,
                                                    )
                                                  }
                                                  onClick={() => {
                                                    onFollowListActionClick(
                                                      item,
                                                    );
                                                  }}
                                                >
                                                  {followListUpdatingIds.has(
                                                    item._id,
                                                  ) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : item.isFollowing ? (
                                                    <>
                                                      <UserCheck className="h-4 w-4" />
                                                    </>
                                                  ) : (
                                                    <>
                                                      <UserPlus className="h-4 w-4" />
                                                    </>
                                                  )}
                                                </Button>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button
                                                      type="button"
                                                      size="icon-sm"
                                                      variant="ghost"
                                                      className="-ml-px rounded-l-none border-transparent text-muted-foreground shadow-none"
                                                      aria-label={`More actions for ${item.username || item.name || "user"}`}
                                                    >
                                                      <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent
                                                    align="end"
                                                    collisionPadding={16}
                                                    className="w-44"
                                                  >
                                                    <DropdownMenuItem
                                                      onClick={() =>
                                                        void onCopyProfileLink(
                                                          item.username,
                                                        )
                                                      }
                                                    >
                                                      <Copy className="h-4 w-4" />
                                                      Copy link
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                      disabled={
                                                        !isAuthenticated ||
                                                        followListUpdatingIds.has(
                                                          item._id,
                                                        )
                                                      }
                                                      onClick={() => {
                                                        onFollowListActionClick(
                                                          item,
                                                        );
                                                      }}
                                                    >
                                                      {item.isFollowing ? (
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
                                          </CommandItem>
                                        ))
                                      : tab === "strategies"
                                        ? (
                                            tabState.items as ProfileStrategyListItem[]
                                          ).map((item) => (
                                            <CommandItem
                                              key={item._id}
                                              value={`${item.name || ""} ${item.description || ""}`}
                                              className="theme-hover-surface flex min-w-0 overflow-hidden cursor-pointer items-center justify-between gap-3 rounded-md py-2 pl-3 pr-0 text-left hover:bg-muted/60 data-[selected=true]:bg-transparent data-[selected=true]:hover:bg-muted/60"
                                            >
                                              <Link
                                                to={`/strategy/${item._id}`}
                                                state={{
                                                  fromProfileUrl:
                                                    currentProfileDialogUrl,
                                                  fromProfileUsername:
                                                    routeUsername,
                                                }}
                                                className="w-0 min-w-0 flex-1 basis-0 overflow-hidden transition hover:text-foreground"
                                              >
                                                <div className="min-w-0 w-full max-w-full overflow-hidden">
                                                  <p className="block w-full truncate font-medium">
                                                    {item.name || "Strategy"}
                                                  </p>
                                                  <p className="block w-full truncate text-xs text-muted-foreground">
                                                    {item.description ||
                                                      "No description provided."}
                                                  </p>
                                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                      <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                                                      <span className="truncate">
                                                        @
                                                        {routeUsername ||
                                                          "unknown"}
                                                      </span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                      {item.isPublic ? (
                                                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                                      ) : (
                                                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                                      )}
                                                      {item.isPublic
                                                        ? "Public"
                                                        : "Private"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                      <TrendingUp className="h-3.5 w-3.5" />
                                                      {item.stats?.viewCount ??
                                                        "-"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5">
                                                      <Bookmark className="h-3.5 w-3.5" />
                                                      {item.stats
                                                        ?.bookmarkCount ?? "-"}
                                                    </span>
                                                  </div>
                                                </div>
                                              </Link>

                                              <ButtonGroup
                                                aria-label={`Bookmark actions for ${item.name || "strategy"}`}
                                                className="min-w-0 shrink-0"
                                              >
                                                <Button
                                                  type="button"
                                                  size="icon-sm"
                                                  variant="ghost"
                                                  className={cn(
                                                    "rounded-r-none border-transparent shadow-none",
                                                    item.isBookmarked
                                                      ? "text-primary"
                                                      : "text-muted-foreground",
                                                  )}
                                                  disabled={updatingStrategyIds.has(
                                                    item._id,
                                                  )}
                                                  onClick={() => {
                                                    void onToggleProfileStrategyBookmark(
                                                      item._id,
                                                    );
                                                  }}
                                                >
                                                  {updatingStrategyIds.has(
                                                    item._id,
                                                  ) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : item.isBookmarked ? (
                                                    <>
                                                      <BookmarkCheck className="h-4 w-4" />
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Bookmark className="h-4 w-4" />
                                                    </>
                                                  )}
                                                </Button>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button
                                                      type="button"
                                                      size="icon-sm"
                                                      variant="ghost"
                                                      className="-ml-px rounded-l-none border-transparent text-muted-foreground shadow-none"
                                                      aria-label={`More actions for ${item.name || "strategy"}`}
                                                    >
                                                      <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent
                                                    align="end"
                                                    collisionPadding={16}
                                                    className="w-44"
                                                  >
                                                    <DropdownMenuItem
                                                      onClick={() =>
                                                        void onCopyAbsoluteLink(
                                                          `/strategy/${item._id}`,
                                                        )
                                                      }
                                                    >
                                                      <Copy className="h-4 w-4" />
                                                      Copy link
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                      disabled={updatingStrategyIds.has(
                                                        item._id,
                                                      )}
                                                      onClick={() => {
                                                        void onToggleProfileStrategyBookmark(
                                                          item._id,
                                                        );
                                                      }}
                                                    >
                                                      {item.isBookmarked ? (
                                                        <>
                                                          <BookmarkCheck className="h-4 w-4" />
                                                          Bookmarked
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Bookmark className="h-4 w-4" />
                                                          Bookmark
                                                        </>
                                                      )}
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </ButtonGroup>
                                            </CommandItem>
                                          ))
                                        : (
                                            tabState.items as ProfileBacktestListItem[]
                                          ).map((item) => {
                                            const summaryMetrics =
                                              getProfileBacktestSummaryMetrics(
                                                item,
                                              );

                                            return (
                                              <CommandItem
                                                key={item._id}
                                                value={`${item.symbol || ""} ${item.timeframe || ""} ${item.strategy?.name || ""}`}
                                                className="theme-hover-surface flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted/60 data-[selected=true]:bg-transparent data-[selected=true]:hover:bg-muted/60"
                                              >
                                                <Link
                                                  to={`/backtest/${item._id}`}
                                                  className="min-w-0 flex-1 transition hover:text-foreground"
                                                >
                                                  <div className="min-w-0">
                                                    <p className="truncate font-medium">
                                                      {item.symbol || "-"} /{" "}
                                                      {item.timeframe || "-"}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                      {item.strategy?.name ||
                                                        "Strategy"}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                      {summaryMetrics.map(
                                                        (metric) => (
                                                          <span
                                                            key={metric.key}
                                                            className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5"
                                                          >
                                                            <metric.icon
                                                              className={cn(
                                                                "h-3.5 w-3.5",
                                                                metric.key ===
                                                                  "roi"
                                                                  ? metric.valueClassName
                                                                  : "text-muted-foreground",
                                                              )}
                                                            />
                                                            <span
                                                              className={cn(
                                                                "font-medium",
                                                                metric.key ===
                                                                  "roi"
                                                                  ? metric.valueClassName
                                                                  : "text-muted-foreground",
                                                              )}
                                                            >
                                                              {metric.value}
                                                            </span>
                                                          </span>
                                                        ),
                                                      )}
                                                    </div>
                                                  </div>
                                                </Link>

                                                <ButtonGroup
                                                  aria-label={`Bookmark actions for ${item.symbol || "backtest"}`}
                                                  className="min-w-0 shrink-0"
                                                >
                                                  <Button
                                                    type="button"
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    className={cn(
                                                      "rounded-r-none border-transparent shadow-none",
                                                      item.isBookmarked
                                                        ? "text-primary"
                                                        : "text-muted-foreground",
                                                    )}
                                                    disabled={updatingBacktestIds.has(
                                                      item._id,
                                                    )}
                                                    onClick={() => {
                                                      void onToggleProfileBacktestBookmark(
                                                        item._id,
                                                      );
                                                    }}
                                                  >
                                                    {updatingBacktestIds.has(
                                                      item._id,
                                                    ) ? (
                                                      <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : item.isBookmarked ? (
                                                      <>
                                                        <BookmarkCheck className="h-4 w-4" />
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Bookmark className="h-4 w-4" />
                                                      </>
                                                    )}
                                                  </Button>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                      asChild
                                                    >
                                                      <Button
                                                        type="button"
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        className="-ml-px rounded-l-none border-transparent text-muted-foreground shadow-none"
                                                        aria-label={`More actions for ${item.symbol || "backtest"}`}
                                                      >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                      align="end"
                                                      collisionPadding={16}
                                                      className="w-44"
                                                    >
                                                      <DropdownMenuItem
                                                        onClick={() =>
                                                          void onCopyAbsoluteLink(
                                                            `/backtest/${item._id}`,
                                                          )
                                                        }
                                                      >
                                                        <Copy className="h-4 w-4" />
                                                        Copy link
                                                      </DropdownMenuItem>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem
                                                        disabled={updatingBacktestIds.has(
                                                          item._id,
                                                        )}
                                                        onClick={() => {
                                                          void onToggleProfileBacktestBookmark(
                                                            item._id,
                                                          );
                                                        }}
                                                      >
                                                        {item.isBookmarked ? (
                                                          <>
                                                            <BookmarkCheck className="h-4 w-4" />
                                                            Bookmarked
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Bookmark className="h-4 w-4" />
                                                            Bookmark
                                                          </>
                                                        )}
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </ButtonGroup>
                                              </CommandItem>
                                            );
                                          })}

                                    {tabState.hasNextPage ? (
                                      <div
                                        ref={
                                          tab === activeProfileTab
                                            ? profileListLoadMoreRef
                                            : null
                                        }
                                        className="flex h-10 items-center justify-center"
                                      >
                                        {tabState.isAppending &&
                                        tabStatus !== "searching" ? (
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
                              </Command>
                            )}
                          </ScrollArea>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
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
                void onToggleFollow().finally(() => {
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
        open={Boolean(pendingFollowListUnfollowUser)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFollowListUnfollowUser(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfollow this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You can follow this user again anytime from their profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                pendingFollowListUnfollowUser
                  ? followListUpdatingIds.has(pendingFollowListUnfollowUser._id)
                  : false
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                pendingFollowListUnfollowUser
                  ? followListUpdatingIds.has(pendingFollowListUnfollowUser._id)
                  : false
              }
              className="relative !bg-destructive !text-white hover:!bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();

                if (!pendingFollowListUnfollowUser) return;

                void onToggleFollowListUser(
                  pendingFollowListUnfollowUser,
                ).finally(() => {
                  setPendingFollowListUnfollowUser(null);
                });
              }}
            >
              {pendingFollowListUnfollowUser &&
              followListUpdatingIds.has(pendingFollowListUnfollowUser._id) ? (
                <Loader2 className="absolute h-4 w-4 animate-spin text-white" />
              ) : null}
              <span
                className={
                  pendingFollowListUnfollowUser &&
                  followListUpdatingIds.has(pendingFollowListUnfollowUser._id)
                    ? "opacity-0"
                    : undefined
                }
              >
                Unfollow
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
