import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  CandlestickChart,
  ChevronDown,
  Copy,
  ImagePlus,
  ListFilter,
  Loader2,
  Pencil,
  Save,
  Search,
  SearchX,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { getApiErrorMessage } from "@/api/axios"
import { createFollow, deleteFollow, fetchFollowStatus } from "@/api/follow"
import {
  fetchUserBacktestsByUsername,
  fetchUserFollowsByUsername,
  fetchUserStrategiesByUsername,
} from "@/api/user"
import { useAuthStore } from "@/store/auth"
import { useBookmarkStore } from "@/store/bookmark"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { editProfile } from "@/api/auth"
import { fetchUserByUsername } from "@/api/user"
import { cn } from "@/lib/utils"

function sanitizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20)
}

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

type FormState = {
  name: string
  username: string
  avatar: string
}

type PublicProfileUser = {
  _id?: string
  name?: string
  username?: string
  avatar?: string
  createdAt?: string
  stats?: {
    followerCount?: number
    followingCount?: number
    strategyCount?: number
    backtestCount?: number
  }
}

type PublicProfileResponse = {
  result?: {
    user?: PublicProfileUser
  }
}

type ProfileDialogTab = "followers" | "following" | "strategies" | "backtests"

type ProfileFollowListItem = {
  _id: string
  name?: string
  username?: string
  avatar?: string
}

type ProfileStrategyListItem = {
  _id: string
  name?: string
  description?: string
  isPublic?: boolean
  createdAt?: string
  updatedAt?: string
  stats?: {
    viewCount?: number
    bookmarkCount?: number
  }
}

type ProfileBacktestListItem = {
  _id: string
  symbol?: string
  timeframe?: string
  createdAt?: string
  strategy?: {
    name?: string
  }
  result?: {
    roi?: number
    totalTrades?: number
    winRate?: number
    profitFactor?: number
    maxDrawdownPercent?: number
  }
}

type ProfileListState = {
  items: Array<
    ProfileFollowListItem | ProfileStrategyListItem | ProfileBacktestListItem
  >
  total: number
  page: number
  hasNextPage: boolean
  isLoading: boolean
  isAppending: boolean
  error: string
  search: string
  debouncedSearch: string
  sortBy: string
  order: "asc" | "desc"
}

const defaultProfileListState = (
  sortBy: string,
  order: "asc" | "desc"
): ProfileListState => ({
  items: [],
  total: 0,
  page: 1,
  hasNextPage: false,
  isLoading: false,
  isAppending: false,
  error: "",
  search: "",
  debouncedSearch: "",
  sortBy,
  order,
})

const dialogTabLabels: Record<ProfileDialogTab, string> = {
  followers: "Followers",
  following: "Following",
  strategies: "Strategies",
  backtests: "Backtests",
}

const ratio = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatSignedPercent(value?: number) {
  const numericValue = value ?? 0
  return `${numericValue >= 0 ? "+" : ""}${ratio.format(numericValue)}%`
}

function getProfileBacktestMetric(
  item: ProfileBacktestListItem,
  sortBy: string
): {
  label: string
  value: string
  valueClassName: string
} {
  switch (sortBy) {
    case "winRate":
      return {
        label: "Win Rate",
        value: `${ratio.format(item.result?.winRate ?? 0)}%`,
        valueClassName: "text-foreground",
      }
    case "profitFactor":
      return {
        label: "Profit Factor",
        value: ratio.format(item.result?.profitFactor ?? 0),
        valueClassName: "text-foreground",
      }
    case "maxDrawdownPercent":
      return {
        label: "Max DD",
        value: `${ratio.format(item.result?.maxDrawdownPercent ?? 0)}%`,
        valueClassName: "text-foreground",
      }
    case "createdAt":
      return {
        label: "Created",
        value: item.createdAt
          ? shortDate.format(new Date(item.createdAt))
          : "-",
        valueClassName: "text-foreground",
      }
    case "roi":
    default: {
      const roiValue = item.result?.roi ?? 0

      return {
        label: "ROI",
        value: formatSignedPercent(roiValue),
        valueClassName: roiValue >= 0 ? "text-emerald-600" : "text-destructive",
      }
    }
  }
}

export default function Profile() {
  const { username: routeUsernameParam = "" } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const updateUser = useAuthStore((state) => state.updateUser)
  const bookmarkedStrategyIds = useBookmarkStore(
    (state) => state.bookmarkedStrategyIds
  )
  const bookmarkedBacktestIds = useBookmarkStore(
    (state) => state.bookmarkedBacktestIds
  )
  const updatingStrategyIds = useBookmarkStore(
    (state) => state.updatingStrategyIds
  )
  const updatingBacktestIds = useBookmarkStore(
    (state) => state.updatingBacktestIds
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

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [viewedUser, setViewedUser] = useState<PublicProfileUser | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState("")
  const [selectedAvatarFileName, setSelectedAvatarFileName] = useState("")
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(false)
  const [isFollowUpdating, setIsFollowUpdating] = useState(false)
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false)
  const [pendingFollowListUnfollowUser, setPendingFollowListUnfollowUser] =
    useState<ProfileFollowListItem | null>(null)
  const [isProfileListsOpen, setIsProfileListsOpen] = useState(false)
  const [followListStatusById, setFollowListStatusById] = useState<
    Record<string, boolean>
  >({})
  const [followListStatusLoadingIds, setFollowListStatusLoadingIds] = useState<
    Set<string>
  >(new Set())
  const [followListUpdatingIds, setFollowListUpdatingIds] = useState<
    Set<string>
  >(new Set())
  const [activeProfileTab, setActiveProfileTab] =
    useState<ProfileDialogTab>("followers")
  const [profileLists, setProfileLists] = useState<
    Record<ProfileDialogTab, ProfileListState>
  >({
    followers: defaultProfileListState("name", "asc"),
    following: defaultProfileListState("name", "asc"),
    strategies: defaultProfileListState("name", "asc"),
    backtests: defaultProfileListState("roi", "desc"),
  })
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const profileListScrollRef = useRef<HTMLDivElement | null>(null)
  const profileListLoadMoreRef = useRef<HTMLDivElement | null>(null)
  const bookmarkListLoadedRef = useRef({
    strategies: false,
    backtests: false,
  })

  const [form, setForm] = useState<FormState>({
    name: user?.name || "",
    username: user?.username || "",
    avatar: user?.avatar || "",
  })

  const routeUsername = routeUsernameParam.toLowerCase()
  const requestedDialog = searchParams.get("dialog")
  const requestedTab = searchParams.get("tab")
  const isOwnProfileRoute =
    Boolean(user?.username) &&
    Boolean(routeUsername) &&
    routeUsername === user?.username?.toLowerCase()
  const canEditProfile = Boolean(user) && isOwnProfileRoute
  const currentProfileDialogUrl = `${location.pathname}?dialog=profile&tab=${activeProfileTab}`
  const fromProfileUrl =
    typeof location.state === "object" &&
    location.state !== null &&
    "fromProfileUrl" in location.state &&
    typeof (location.state as { fromProfileUrl?: unknown }).fromProfileUrl ===
      "string"
      ? (location.state as { fromProfileUrl: string }).fromProfileUrl
      : ""
  const profileListRequestIdRef = useRef<Record<ProfileDialogTab, number>>({
    followers: 0,
    following: 0,
    strategies: 0,
    backtests: 0,
  })
  const onBack = () => {
    if (fromProfileUrl) {
      navigate(fromProfileUrl, { replace: true })
      return
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(isAuthenticated ? "/dashboard" : "/")
  }

  useEffect(() => {
    const normalizedTab =
      requestedTab &&
      ["followers", "following", "strategies", "backtests"].includes(
        requestedTab
      )
        ? (requestedTab as ProfileDialogTab)
        : null

    if (requestedDialog === "profile" && normalizedTab) {
      setActiveProfileTab(normalizedTab)
      setIsProfileListsOpen(true)
      return
    }

    setIsProfileListsOpen(false)
  }, [requestedDialog, requestedTab])

  useEffect(() => {
    if (!isProfileListsOpen) return

    const nextParams = new URLSearchParams(searchParams)
    const currentTab = nextParams.get("tab")
    const currentDialog = nextParams.get("dialog")

    if (currentDialog === "profile" && currentTab === activeProfileTab) {
      return
    }

    nextParams.set("dialog", "profile")
    nextParams.set("tab", activeProfileTab)
    setSearchParams(nextParams, { replace: true })
  }, [activeProfileTab, isProfileListsOpen, searchParams, setSearchParams])

  const initials =
    (canEditProfile ? form.name || user?.name : viewedUser?.name)
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  const hasChanged = useMemo(() => {
    if (!user) return false

    return (
      form.name.trim() !== user.name ||
      form.username.trim() !== user.username ||
      (form.avatar.trim() || "") !== (user.avatar || "")
    )
  }, [form, user])

  const isFormValid = useMemo(() => {
    if (!user) return false

    const nextName = form.name.trim()
    const nextUsername = form.username.trim()
    const isNameChanged = nextName !== user.name
    const isUsernameChanged = nextUsername !== user.username

    if (isNameChanged && !/^[A-Za-z0-9 ]{1,20}$/.test(nextName)) return false
    if (isUsernameChanged && !/^[a-z0-9]{6,20}$/.test(nextUsername))
      return false

    return true
  }, [form.name, form.username, user])

  useEffect(() => {
    let isActive = true

    if (!routeUsername) {
      setViewedUser(null)
      setIsFollowing(false)
      setProfileLoadError("")
      setIsProfileLoading(false)
      setIsFollowStatusLoading(false)
      return () => {
        isActive = false
      }
    }

    const loadUserProfile = async () => {
      setIsProfileLoading(true)
      setIsFollowStatusLoading(isAuthenticated && !canEditProfile)
      setProfileLoadError("")

      try {
        const response = (await fetchUserByUsername(
          routeUsername
        )) as PublicProfileResponse

        if (!isActive) return

        const nextUser = response?.result?.user ?? null

        if (!nextUser?._id) {
          setProfileLoadError("User not found.")
          setViewedUser(null)
          setIsFollowing(false)
          return
        }

        let nextIsFollowing = false

        if (isAuthenticated && !canEditProfile) {
          const followStatusResponse = await fetchFollowStatus(nextUser._id)
          if (!isActive) return
          nextIsFollowing = Boolean(followStatusResponse?.result?.isFollowing)
        }

        setViewedUser(nextUser)
        setIsFollowing(nextIsFollowing)

        if (
          canEditProfile &&
          user &&
          (user.name !== (nextUser.name ?? user.name) ||
            user.username !== (nextUser.username ?? user.username) ||
            (user.avatar || "") !== (nextUser.avatar || "") ||
            JSON.stringify(user.stats ?? {}) !==
              JSON.stringify(nextUser.stats ?? {}))
        ) {
          updateUser({
            name: nextUser.name ?? user.name,
            username: nextUser.username ?? user.username,
            avatar: nextUser.avatar || undefined,
            stats: nextUser.stats ?? user.stats,
          })
        }
      } catch (error) {
        if (!isActive) return
        const message =
          typeof error === "object" && error !== null
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : undefined
        setProfileLoadError(message || "Failed to load user profile.")
      } finally {
        if (isActive) {
          setIsProfileLoading(false)
          setIsFollowStatusLoading(false)
        }
      }
    }

    void loadUserProfile()

    return () => {
      isActive = false
    }
  }, [canEditProfile, isAuthenticated, routeUsername, updateUser, user])

  useEffect(() => {
    const timers = (Object.keys(profileLists) as Array<ProfileDialogTab>).map(
      (tab) =>
        setTimeout(() => {
          setProfileLists((prev) => {
            const nextSearch = prev[tab].search.trim()
            if (prev[tab].debouncedSearch === nextSearch) {
              return prev
            }

            return {
              ...prev,
              [tab]: {
                ...prev[tab],
                debouncedSearch: nextSearch,
                page: 1,
              },
            }
          })
        }, 350)
    )

    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [profileLists])

  const activeListState = profileLists[activeProfileTab]
  const activeListPage = activeListState.page
  const activeListSearch = activeListState.debouncedSearch
  const activeListSortBy = activeListState.sortBy
  const activeListOrder = activeListState.order
  const currentUserId = user?._id

  useEffect(() => {
    if (!isProfileListsOpen || !routeUsername) return

    const tab = activeProfileTab
    const requestId = profileListRequestIdRef.current[tab] + 1
    profileListRequestIdRef.current[tab] = requestId

    setProfileLists((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        error: "",
        isLoading: prev[tab].page === 1,
        isAppending: prev[tab].page > 1,
      },
    }))

    const load = async () => {
      try {
        let result:
          | {
              result?: {
                items?: Array<
                  | ProfileFollowListItem
                  | ProfileStrategyListItem
                  | ProfileBacktestListItem
                >
                total?: number
                hasNextPage?: boolean
              }
            }
          | undefined

        if (tab === "followers" || tab === "following") {
          result = await fetchUserFollowsByUsername(routeUsername, {
            type: tab,
            page: activeListPage,
            search: activeListSearch,
            sortBy: activeListSortBy,
            order: activeListOrder,
          })
        } else if (tab === "strategies") {
          const shouldLoadBookmarks =
            isAuthenticated &&
            activeListPage === 1 &&
            !bookmarkListLoadedRef.current.strategies

          const [strategyResult] = await Promise.all([
            fetchUserStrategiesByUsername(routeUsername, {
              page: activeListPage,
              search: activeListSearch,
              sortBy: activeListSortBy,
              order: activeListOrder,
            }),
            shouldLoadBookmarks
              ? loadStrategyBookmarks().then(() => {
                  bookmarkListLoadedRef.current.strategies = true
                })
              : Promise.resolve(),
          ])

          result = strategyResult
        } else {
          const shouldLoadBookmarks =
            isAuthenticated &&
            activeListPage === 1 &&
            !bookmarkListLoadedRef.current.backtests

          const [backtestResult] = await Promise.all([
            fetchUserBacktestsByUsername(routeUsername, {
              page: activeListPage,
              search: activeListSearch,
              sortBy: activeListSortBy,
              order: activeListOrder,
            }),
            shouldLoadBookmarks
              ? loadBacktestBookmarks().then(() => {
                  bookmarkListLoadedRef.current.backtests = true
                })
              : Promise.resolve(),
          ])

          result = backtestResult
        }

        if (profileListRequestIdRef.current[tab] !== requestId) return

        const nextItems = result?.result?.items ?? []

        if (isAuthenticated && (tab === "followers" || tab === "following")) {
          const followItems = nextItems as ProfileFollowListItem[]
          const idsToFetch = followItems
            .map((item) => item._id)
            .filter((itemId) => itemId && itemId !== currentUserId)

          if (idsToFetch.length > 0) {
            setFollowListStatusLoadingIds((prev) => {
              const next = new Set(prev)
              idsToFetch.forEach((itemId) => next.add(itemId))
              return next
            })

            try {
              const followStatuses = await Promise.all(
                idsToFetch.map(async (itemId) => {
                  const response = await fetchFollowStatus(itemId)
                  return {
                    itemId,
                    isFollowing: Boolean(response?.result?.isFollowing),
                  }
                })
              )

              if (profileListRequestIdRef.current[tab] !== requestId) return

              setFollowListStatusById((prev) => {
                const next = { ...prev }
                followStatuses.forEach(({ itemId, isFollowing }) => {
                  next[itemId] = isFollowing
                })
                return next
              })
            } finally {
              setFollowListStatusLoadingIds((prev) => {
                const next = new Set(prev)
                idsToFetch.forEach((itemId) => next.delete(itemId))
                return next
              })
            }
          }
        }

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
                          (existing) => existing._id === item._id
                        )
                    ),
                  ],
            total: result?.result?.total ?? 0,
            hasNextPage: Boolean(result?.result?.hasNextPage),
            isLoading: false,
            isAppending: false,
            error: "",
          },
        }))
      } catch (error) {
        if (profileListRequestIdRef.current[tab] !== requestId) return

        setProfileLists((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            isLoading: false,
            isAppending: false,
            error: getApiErrorMessage(error, "Failed to load items"),
          },
        }))
      }
    }

    void load()
  }, [
    activeListOrder,
    activeListPage,
    activeListSearch,
    activeListSortBy,
    activeProfileTab,
    currentUserId,
    isProfileListsOpen,
    routeUsername,
    isAuthenticated,
    loadStrategyBookmarks,
    loadBacktestBookmarks,
  ])

  useEffect(() => {
    const node = profileListLoadMoreRef.current
    const root = profileListScrollRef.current

    if (
      !node ||
      !root ||
      !isProfileListsOpen ||
      !activeListState.hasNextPage ||
      activeListState.isLoading ||
      activeListState.isAppending
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]

        if (firstEntry?.isIntersecting) {
          updateProfileListState(activeProfileTab, (state) => ({
            ...state,
            page: state.page + 1,
          }))
        }
      },
      {
        root,
        rootMargin: "220px 0px",
        threshold: 0,
      }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [
    activeListState.hasNextPage,
    activeListState.isAppending,
    activeListState.isLoading,
    activeProfileTab,
    isProfileListsOpen,
  ])

  useEffect(() => {
    if (!isAuthenticated) {
      bookmarkListLoadedRef.current = {
        strategies: false,
        backtests: false,
      }
    }
  }, [isAuthenticated])

  if (!routeUsername && isAuthenticated && user?.username) {
    return <Navigate to={`/${user.username}`} replace />
  }

  if (!routeUsername && !isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (
    !canEditProfile &&
    !isProfileLoading &&
    !viewedUser &&
    Boolean(profileLoadError)
  ) {
    return (
      <TooltipProvider>
        <div className="mx-auto w-full max-w-4xl">
          <Button
            variant="outline"
            size="sm"
            className="theme-glass-button mb-3 w-fit"
            onClick={onBack}
          >
            <span className="inline-flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back
            </span>
          </Button>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="mt-2 text-muted-foreground">Public profile details.</p>

          <Card className="mt-6">
            <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
              <SearchX className="h-8 w-8 text-muted-foreground" />
              <p className="text-lg font-semibold text-foreground">
                User not found
              </p>
              <p className="text-sm text-muted-foreground">
                {profileLoadError || "This username does not exist."}
              </p>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    )
  }

  if (!canEditProfile && isProfileLoading) {
    return (
      <TooltipProvider>
        <div className="mx-auto w-full max-w-4xl">
          <Button
            variant="outline"
            size="sm"
            className="theme-glass-button mb-3 w-fit"
            onClick={onBack}
          >
            <span className="inline-flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back
            </span>
          </Button>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="mt-2 text-muted-foreground">Public profile details.</p>

          <div className="mt-6 flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching profile...
          </div>
        </div>
      </TooltipProvider>
    )
  }

  const onCancel = () => {
    if (!user) return
    setForm({
      name: user.name || "",
      username: user.username || "",
      avatar: user.avatar || "",
    })
    setSelectedAvatarFileName("")
    setIsEditing(false)
  }

  const onStartEditing = () => {
    if (!user) return
    setForm({
      name: user.name || "",
      username: user.username || "",
      avatar: user.avatar || "",
    })
    setSelectedAvatarFileName("")
    setIsEditing(true)
  }

  const onAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      setSelectedAvatarFileName("")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller")
      setSelectedAvatarFileName("")
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        avatar: typeof reader.result === "string" ? reader.result : prev.avatar,
      }))
      setSelectedAvatarFileName(file.name)
    }

    reader.onerror = () => {
      toast.error("Failed to read selected image")
    }

    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const onRemoveSelectedAvatar = () => {
    if (!user) return
    setForm((prev) => ({
      ...prev,
      avatar: user.avatar || "",
    }))
    setSelectedAvatarFileName("")
  }

  const onSave = async () => {
    if (!user) return
    const nextName = form.name.trim()
    const nextUsername = form.username.trim()
    const nextAvatar = form.avatar.trim()
    const payload: { name?: string; username?: string; avatar?: string } = {}

    if (!isFormValid) return

    if (nextName !== user.name) {
      payload.name = nextName
    }

    if (nextUsername !== user.username) {
      payload.username = nextUsername
    }

    if ((nextAvatar || "") !== (user.avatar || "")) {
      payload.avatar = nextAvatar
    }

    if (Object.keys(payload).length === 0) return

    setIsSaving(true)

    const promise = editProfile(payload)

    toast.promise(promise, {
      loading: "Updating profile...",
      success: (data) => {
        const nextUsername = payload.username ?? user.username
        updateUser({
          name: payload.name ?? user.name,
          username: nextUsername,
          avatar:
            payload.avatar !== undefined
              ? payload.avatar || undefined
              : user.avatar,
        })
        setIsEditing(false)
        navigate(`/${nextUsername}`, { replace: true })
        return data.message
      },
      error: (error: unknown) =>
        getApiErrorMessage(error, "Failed to update profile!"),
    })

    promise.finally(() => setIsSaving(false))
  }

  const onToggleFollow = async () => {
    if (!viewedUser?._id || !isAuthenticated) return

    setIsFollowUpdating(true)

    try {
      const response = isFollowing
        ? await deleteFollow(viewedUser._id)
        : await createFollow(viewedUser._id)

      setIsFollowing((prev) => !prev)
      setViewedUser((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                followerCount: Math.max(
                  0,
                  (prev.stats?.followerCount ?? 0) + (isFollowing ? -1 : 1)
                ),
              },
            }
          : prev
      )
      if (user) {
        updateUser({
          stats: {
            ...user.stats,
            followingCount: Math.max(
              0,
              (user.stats?.followingCount ?? 0) + (isFollowing ? -1 : 1)
            ),
          },
        })
      }

      toast.success(
        response?.message ||
          (isFollowing
            ? "User unfollowed successfully."
            : "User followed successfully.")
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update follow status"))
    } finally {
      setIsFollowUpdating(false)
    }
  }

  const onCopyProfileLink = async (usernameOverride?: string) => {
    const username = usernameOverride || viewedUser?.username || routeUsername
    if (!username || typeof window === "undefined") return

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${username}`
      )
      toast.success("Profile link copied.")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy profile link"))
    }
  }

  const onCopyAbsoluteLink = async (path: string) => {
    if (typeof window === "undefined") return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      toast.success("Link copied.")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to copy link"))
    }
  }

  const onToggleProfileStrategyBookmark = async (strategyId: string) => {
    const response = await toggleStrategyBookmark(strategyId)
    if (!response) return

    if (response.status === "success") {
      toast.success(response.message)
      return
    }

    toast.error(response.message)
  }

  const onToggleProfileBacktestBookmark = async (backtestId: string) => {
    const response = await toggleBacktestBookmark(backtestId)
    if (!response) return

    if (response.status === "success") {
      toast.success(response.message)
      return
    }

    toast.error(response.message)
  }

  const onToggleFollowListUser = async (targetUser: ProfileFollowListItem) => {
    if (!isAuthenticated || !targetUser._id || targetUser._id === user?._id) {
      return
    }

    const isCurrentlyFollowing = Boolean(followListStatusById[targetUser._id])

    setFollowListUpdatingIds((prev) => {
      const next = new Set(prev)
      next.add(targetUser._id)
      return next
    })

    try {
      const response = isCurrentlyFollowing
        ? await deleteFollow(targetUser._id)
        : await createFollow(targetUser._id)

      setFollowListStatusById((prev) => ({
        ...prev,
        [targetUser._id]: !isCurrentlyFollowing,
      }))

      if (
        canEditProfile &&
        activeProfileTab === "following" &&
        isCurrentlyFollowing
      ) {
        updateProfileListState("following", (state) => ({
          ...state,
          items: state.items.filter((item) => item._id !== targetUser._id),
          total: Math.max(0, state.total - 1),
        }))
      }

      if (user) {
        updateUser({
          stats: {
            ...user.stats,
            followingCount: Math.max(
              0,
              (user.stats?.followingCount ?? 0) +
                (isCurrentlyFollowing ? -1 : 1)
            ),
          },
        })
      }

      toast.success(
        response?.message ||
          (isCurrentlyFollowing
            ? "User unfollowed successfully."
            : "User followed successfully.")
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update follow status"))
    } finally {
      setFollowListUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(targetUser._id)
        return next
      })
    }
  }

  const onFollowListActionClick = (targetUser: ProfileFollowListItem) => {
    if (followListStatusById[targetUser._id]) {
      setPendingFollowListUnfollowUser(targetUser)
      return
    }

    void onToggleFollowListUser(targetUser)
  }

  const onFollowButtonClick = () => {
    if (isFollowing) {
      setIsUnfollowDialogOpen(true)
      return
    }

    void onToggleFollow()
  }

  const openProfileTab = (tab: ProfileDialogTab) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("dialog", "profile")
    nextParams.set("tab", tab)
    setSearchParams(nextParams, { replace: false })
  }

  const updateProfileListState = (
    tab: ProfileDialogTab,
    updater: (state: ProfileListState) => ProfileListState
  ) => {
    setProfileLists((prev) => ({
      ...prev,
      [tab]: updater(prev[tab]),
    }))
  }

  const profileStats = canEditProfile
    ? (user?.stats ?? viewedUser?.stats)
    : (viewedUser?.stats ?? user?.stats)
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
  ]

  const activeSortOptions =
    activeProfileTab === "followers" || activeProfileTab === "following"
      ? [
          { value: "name", label: "Name" },
          { value: "username", label: "Username" },
        ]
      : activeProfileTab === "strategies"
        ? [
            { value: "createdAt", label: "Created" },
            { value: "name", label: "Name" },
            { value: "popular", label: "Popular" },
            { value: "updatedAt", label: "Updated" },
          ]
        : [
            { value: "createdAt", label: "Created" },
            { value: "maxDrawdownPercent", label: "Max DD %" },
            { value: "profitFactor", label: "Profit Factor" },
            { value: "roi", label: "ROI" },
            { value: "winRate", label: "Win Rate" },
          ]

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-4xl">
        <Button
          variant="outline"
          size="sm"
          className="theme-glass-button mb-3 w-fit"
          onClick={onBack}
        >
          <span className="inline-flex items-center gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Back
          </span>
        </Button>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-muted-foreground">
          {canEditProfile
            ? "Manage your personal information details."
            : "Public profile details."}
        </p>

        <div
          className={cn(
            "mt-6 grid items-start gap-6",
            canEditProfile
              ? "md:grid-cols-[280px_1fr]"
              : "md:grid-cols-[minmax(0,1fr)]"
          )}
        >
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Public Info</CardTitle>
              <CardDescription>Visible on your public profile.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Avatar className="h-24 w-24">
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

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-lg leading-tight font-semibold">
                    {canEditProfile
                      ? form.name || user?.name
                      : viewedUser?.name || "Unknown"}
                  </p>
                  <p className="text-sm leading-tight text-muted-foreground">
                    @
                    {canEditProfile
                      ? form.username || user?.username
                      : viewedUser?.username || routeUsername}
                  </p>
                </div>

                <div className="inline-grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {statItems.map(({ tab, label, value }) => (
                    <button
                      type="button"
                      key={label}
                      className="inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-left transition hover:bg-muted/40 hover:text-foreground"
                      onClick={() => openProfileTab(tab)}
                    >
                      <span
                        className={cn(
                          "font-semibold text-foreground",
                          typeof value === "number" &&
                            value > 0 &&
                            "text-primary"
                        )}
                      >
                        {typeof value === "number"
                          ? compactNumber.format(value)
                          : "--"}
                      </span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Member since{" "}
                {new Date(
                  (canEditProfile ? user?.createdAt : viewedUser?.createdAt) ||
                    Date.now()
                ).toLocaleDateString()}
              </div>

              {!canEditProfile && viewedUser?._id ? (
                <ButtonGroup
                  aria-label="Follow actions"
                  className="w-full min-w-0"
                >
                  <Button
                    type="button"
                    size="sm"
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
                        <span className="hidden sm:inline">Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Follow</span>
                      </>
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
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
                            setIsUnfollowDialogOpen(true)
                            return
                          }

                          void onToggleFollow()
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
            </CardContent>
          </Card>

          {canEditProfile ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>
                    Keep your profile up to date.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage
                        src={form.avatar || user.avatar}
                        alt={form.name || user.name}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    {isEditing && (
                      <>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={onAvatarSelect}
                        />
                        <div className="relative w-full sm:max-w-[12rem]">
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
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="name">Name</Label>
                    <HelpTooltip
                      label="Name requirements"
                      content="Letters, numbers, and spaces only (1-20 characters)."
                    />
                  </div>
                  <Input
                    id="name"
                    value={form.name}
                    disabled={!isEditing || isSaving}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="username">Username</Label>
                    <HelpTooltip
                      label="Username requirements"
                      content="Lowercase letters and numbers only (6-20 characters)."
                    />
                  </div>
                  <Input
                    id="username"
                    value={form.username}
                    disabled={!isEditing || isSaving}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        username: sanitizeUsername(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="pt-1">
                  {!isEditing ? (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-start">
                      <Button
                        onClick={onStartEditing}
                        variant="outline"
                        className="w-full sm:w-40"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-start">
                      <Button
                        onClick={onSave}
                        disabled={!hasChanged || isSaving || !isFormValid}
                        className="w-full sm:w-40"
                      >
                        {isSaving ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={onCancel}
                        disabled={isSaving}
                        variant="outline"
                        className="w-full sm:w-40"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
      <Dialog
        open={isProfileListsOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsProfileListsOpen(true)
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set("dialog", "profile")
            nextParams.set("tab", activeProfileTab)
            setSearchParams(nextParams, { replace: true })
            return
          }

          setIsProfileListsOpen(false)
          const nextParams = new URLSearchParams(searchParams)
          nextParams.delete("dialog")
          nextParams.delete("tab")
          setSearchParams(nextParams, { replace: true })
        }}
      >
        <DialogContent className="top-[8vh] max-h-[calc(100vh-4rem)] -translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10vh] sm:max-w-2xl">
          <DialogHeader className="border-b px-4 pt-4 pb-3">
            <DialogTitle>{dialogTabLabels[activeProfileTab]}</DialogTitle>
            <DialogDescription>
              Browse this profile&apos;s public activity and content.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeProfileTab}
            onValueChange={(value) =>
              setActiveProfileTab(value as ProfileDialogTab)
            }
            className="min-h-0 flex-1 gap-0"
          >
            <div className="min-w-0 border-b px-4 py-3">
              <TabsList className="w-full">
                {(Object.keys(dialogTabLabels) as Array<ProfileDialogTab>).map(
                  (tab) => (
                    <TabsTrigger key={tab} value={tab}>
                      {dialogTabLabels[tab]}
                    </TabsTrigger>
                  )
                )}
              </TabsList>
            </div>

            <div className="min-w-0 border-b px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={activeListState.search}
                    onChange={(event) =>
                      updateProfileListState(activeProfileTab, (state) => ({
                        ...state,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Search"
                    className="pr-12 pl-9"
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
                          onClick={() =>
                            updateProfileListState(
                              activeProfileTab,
                              (state) => ({
                                ...state,
                                sortBy: option.value,
                                page: 1,
                              })
                            )
                          }
                        >
                          {option.label}
                          {activeListState.sortBy === option.value ? " ✓" : ""}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Order</DropdownMenuLabel>
                      {(["asc", "desc"] as const).map((value) => (
                        <DropdownMenuItem
                          key={value}
                          onClick={() =>
                            updateProfileListState(
                              activeProfileTab,
                              (state) => ({
                                ...state,
                                order: value,
                                page: 1,
                              })
                            )
                          }
                        >
                          {value === "asc" ? "Asc" : "Desc"}
                          {activeListState.order === value ? " ✓" : ""}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {(Object.keys(dialogTabLabels) as Array<ProfileDialogTab>).map(
              (tab) => {
                const tabState = profileLists[tab]

                return (
                  <TabsContent
                    key={tab}
                    value={tab}
                    className="min-h-0 flex-1 overflow-hidden"
                  >
                    <div
                      ref={
                        tab === activeProfileTab ? profileListScrollRef : null
                      }
                      className="max-h-[320px] min-w-0 overflow-x-hidden overflow-y-auto px-4 py-4"
                    >
                      {tabState.isLoading ? (
                        <div className="flex min-h-16 items-center justify-center py-2 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading {dialogTabLabels[tab].toLowerCase()}...
                        </div>
                      ) : tabState.error ? (
                        <div className="flex min-h-16 items-center justify-center py-2 text-sm text-destructive">
                          {tabState.error}
                        </div>
                      ) : tabState.items.length === 0 ? (
                        <div className="flex min-h-16 items-center justify-center py-2 text-sm text-muted-foreground">
                          No {dialogTabLabels[tab].toLowerCase()} found.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tab === "followers" || tab === "following"
                            ? (tabState.items as ProfileFollowListItem[]).map(
                                (item) => (
                                  <div
                                    key={item._id}
                                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-3"
                                  >
                                    <Link
                                      to={`/${item.username}`}
                                      state={{
                                        fromProfileUrl: currentProfileDialogUrl,
                                      }}
                                      className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-foreground"
                                      onClick={() =>
                                        setIsProfileListsOpen(false)
                                      }
                                    >
                                      <Avatar className="h-10 w-10">
                                        <AvatarImage
                                          src={item.avatar}
                                          alt={item.name || item.username}
                                        />
                                        <AvatarFallback>
                                          {(item.name || item.username || "U")
                                            .slice(0, 2)
                                            .toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="truncate font-medium">
                                          {item.name || "Unknown"}
                                        </p>
                                        <p className="truncate text-sm text-muted-foreground">
                                          @{item.username || "unknown"}
                                        </p>
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
                                          size="sm"
                                          variant={
                                            followListStatusById[item._id]
                                              ? "outline"
                                              : "default"
                                          }
                                          className="rounded-r-none"
                                          disabled={
                                            !isAuthenticated ||
                                            followListUpdatingIds.has(
                                              item._id
                                            ) ||
                                            followListStatusLoadingIds.has(
                                              item._id
                                            )
                                          }
                                          onClick={() => {
                                            onFollowListActionClick(item)
                                          }}
                                        >
                                          {followListUpdatingIds.has(
                                            item._id
                                          ) ||
                                          followListStatusLoadingIds.has(
                                            item._id
                                          ) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : followListStatusById[item._id] ? (
                                            <>
                                              <UserCheck className="h-4 w-4" />
                                              <span className="hidden sm:inline">
                                                Following
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <UserPlus className="h-4 w-4" />
                                              <span className="hidden sm:inline">
                                                Follow
                                              </span>
                                            </>
                                          )}
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              type="button"
                                              size="icon-sm"
                                              variant={
                                                followListStatusById[item._id]
                                                  ? "outline"
                                                  : "default"
                                              }
                                              className="-ml-px rounded-l-none"
                                              aria-label={`More actions for ${item.username || item.name || "user"}`}
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
                                              onClick={() =>
                                                void onCopyProfileLink(
                                                  item.username
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
                                                  item._id
                                                ) ||
                                                followListStatusLoadingIds.has(
                                                  item._id
                                                )
                                              }
                                              onClick={() => {
                                                onFollowListActionClick(item)
                                              }}
                                            >
                                              {followListStatusById[
                                                item._id
                                              ] ? (
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
                                )
                              )
                            : tab === "strategies"
                              ? (
                                  tabState.items as ProfileStrategyListItem[]
                                ).map((item) => (
                                  <div
                                    key={item._id}
                                    className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-3"
                                  >
                                    <Link
                                      to={`/strategy/${item._id}`}
                                      state={{
                                        fromProfileUrl: currentProfileDialogUrl,
                                        fromProfileUsername: routeUsername,
                                      }}
                                      className="min-w-0 flex-1 transition hover:text-foreground"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate font-medium">
                                            {item.name || "Strategy"}
                                          </p>
                                          <p className="line-clamp-2 text-sm text-muted-foreground">
                                            {item.description ||
                                              "No description provided."}
                                          </p>
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                                              <TrendingUp className="h-3.5 w-3.5" />
                                              {item.stats?.viewCount ?? "-"}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                                              <Bookmark className="h-3.5 w-3.5" />
                                              {item.stats?.bookmarkCount ?? "-"}
                                            </span>
                                            <span className="inline-flex items-center rounded-full border px-2 py-0.5">
                                              {item.isPublic
                                                ? "Public"
                                                : "Private"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </Link>

                                    <ButtonGroup
                                      aria-label={`Bookmark actions for ${item.name || "strategy"}`}
                                      className="min-w-0 shrink-0"
                                    >
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                          bookmarkedStrategyIds.has(item._id)
                                            ? "outline"
                                            : "default"
                                        }
                                        className="rounded-r-none"
                                        disabled={updatingStrategyIds.has(
                                          item._id
                                        )}
                                        onClick={() => {
                                          void onToggleProfileStrategyBookmark(
                                            item._id
                                          )
                                        }}
                                      >
                                        {updatingStrategyIds.has(item._id) ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : bookmarkedStrategyIds.has(
                                            item._id
                                          ) ? (
                                          <>
                                            <BookmarkCheck className="h-4 w-4" />
                                            <span className="hidden sm:inline">
                                              Bookmarked
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Bookmark className="h-4 w-4" />
                                            <span className="hidden sm:inline">
                                              Bookmark
                                            </span>
                                          </>
                                        )}
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            type="button"
                                            size="icon-sm"
                                            variant={
                                              bookmarkedStrategyIds.has(
                                                item._id
                                              )
                                                ? "outline"
                                                : "default"
                                            }
                                            className="-ml-px rounded-l-none"
                                            aria-label={`More actions for ${item.name || "strategy"}`}
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
                                            onClick={() =>
                                              void onCopyAbsoluteLink(
                                                `/strategy/${item._id}`
                                              )
                                            }
                                          >
                                            <Copy className="h-4 w-4" />
                                            Copy link
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            disabled={updatingStrategyIds.has(
                                              item._id
                                            )}
                                            onClick={() => {
                                              void onToggleProfileStrategyBookmark(
                                                item._id
                                              )
                                            }}
                                          >
                                            {bookmarkedStrategyIds.has(
                                              item._id
                                            ) ? (
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
                                  </div>
                                ))
                              : (
                                  tabState.items as ProfileBacktestListItem[]
                                ).map((item) => {
                                  const primaryMetric =
                                    getProfileBacktestMetric(
                                      item,
                                      tabState.sortBy
                                    )

                                  return (
                                    <div
                                      key={item._id}
                                      className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-3"
                                    >
                                      <Link
                                        to={`/backtest/${item._id}`}
                                        className="min-w-0 flex-1 transition hover:text-foreground"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="truncate font-medium">
                                              {item.symbol || "-"} ·{" "}
                                              {item.timeframe || "-"}
                                            </p>
                                            <p className="truncate text-sm text-muted-foreground">
                                              {item.strategy?.name ||
                                                "Strategy"}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                                              {primaryMetric.label}
                                            </p>
                                            <p
                                              className={cn(
                                                "font-medium",
                                                primaryMetric.valueClassName
                                              )}
                                            >
                                              {primaryMetric.value}
                                            </p>
                                          </div>
                                        </div>
                                      </Link>

                                      <ButtonGroup
                                        aria-label={`Bookmark actions for ${item.symbol || "backtest"}`}
                                        className="min-w-0 shrink-0"
                                      >
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant={
                                            bookmarkedBacktestIds.has(item._id)
                                              ? "outline"
                                              : "default"
                                          }
                                          className="rounded-r-none"
                                          disabled={updatingBacktestIds.has(
                                            item._id
                                          )}
                                          onClick={() => {
                                            void onToggleProfileBacktestBookmark(
                                              item._id
                                            )
                                          }}
                                        >
                                          {updatingBacktestIds.has(item._id) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : bookmarkedBacktestIds.has(
                                              item._id
                                            ) ? (
                                            <>
                                              <BookmarkCheck className="h-4 w-4" />
                                              <span className="hidden sm:inline">
                                                Bookmarked
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <Bookmark className="h-4 w-4" />
                                              <span className="hidden sm:inline">
                                                Bookmark
                                              </span>
                                            </>
                                          )}
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              type="button"
                                              size="icon-sm"
                                              variant={
                                                bookmarkedBacktestIds.has(
                                                  item._id
                                                )
                                                  ? "outline"
                                                  : "default"
                                              }
                                              className="-ml-px rounded-l-none"
                                              aria-label={`More actions for ${item.symbol || "backtest"}`}
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
                                              onClick={() =>
                                                void onCopyAbsoluteLink(
                                                  `/backtest/${item._id}`
                                                )
                                              }
                                            >
                                              <Copy className="h-4 w-4" />
                                              Copy link
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              disabled={updatingBacktestIds.has(
                                                item._id
                                              )}
                                              onClick={() => {
                                                void onToggleProfileBacktestBookmark(
                                                  item._id
                                                )
                                              }}
                                            >
                                              {bookmarkedBacktestIds.has(
                                                item._id
                                              ) ? (
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
                                    </div>
                                  )
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
                              {tabState.isAppending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    Loading...
                                  </span>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )
              }
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
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
                event.preventDefault()
                void onToggleFollow().finally(() => {
                  setIsUnfollowDialogOpen(false)
                })
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
        open={Boolean(pendingFollowListUnfollowUser)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFollowListUnfollowUser(null)
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
              disabled={
                pendingFollowListUnfollowUser
                  ? followListUpdatingIds.has(pendingFollowListUnfollowUser._id)
                  : false
              }
              onClick={(event) => {
                event.preventDefault()

                if (!pendingFollowListUnfollowUser) return

                void onToggleFollowListUser(
                  pendingFollowListUnfollowUser
                ).finally(() => {
                  setPendingFollowListUnfollowUser(null)
                })
              }}
            >
              {pendingFollowListUnfollowUser &&
              followListUpdatingIds.has(pendingFollowListUnfollowUser._id) ? (
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
    </TooltipProvider>
  )
}
