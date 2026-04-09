import { create } from "zustand"

import {
  createBookmark,
  deleteBookmark,
  fetchBookmarks,
  type BookmarkTargetType,
} from "@/api/bookmark"
import { useAuthStore } from "@/store/auth"

type BookmarkTargetRef = string | { _id?: string }

type BookmarkListResponse = {
  status: boolean
  message: string
  result?: {
    total?: number
    hasNextPage?: boolean
    bookmarks?: Array<{
      target?: BookmarkTargetRef
    }>
  }
}

type BookmarkActionResponse = {
  status: boolean
  message: string
}

type ToggleBookmarkResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string }

type BookmarkState = {
  bookmarkedStrategyIds: Set<string>
  bookmarkedBacktestIds: Set<string>
  updatingStrategyIds: Set<string>
  updatingBacktestIds: Set<string>
  setBookmarkedStrategyId: (strategyId: string, bookmarked: boolean) => void
  setBookmarkedBacktestId: (backtestId: string, bookmarked: boolean) => void
  setUpdatingStrategyId: (strategyId: string, updating: boolean) => void
  setUpdatingBacktestId: (backtestId: string, updating: boolean) => void
  loadStrategyBookmarks: () => Promise<void>
  loadBacktestBookmarks: () => Promise<void>
  toggleStrategyBookmark: (
    strategyId: string
  ) => Promise<ToggleBookmarkResult | null>
  toggleBacktestBookmark: (
    backtestId: string
  ) => Promise<ToggleBookmarkResult | null>
}

function getBookmarkTargetId(target?: string | { _id?: string }) {
  return getTargetId(target)
}

function getTargetId(target?: BookmarkTargetRef) {
  if (typeof target === "string") {
    return target
  }

  if (typeof target === "object" && target?._id) {
    return target._id
  }

  return ""
}

function updateIdSet(
  current: Set<string>,
  strategyId: string,
  shouldInclude: boolean
) {
  const next = new Set(current)

  if (shouldInclude) {
    next.add(strategyId)
  } else {
    next.delete(strategyId)
  }

  return next
}

async function fetchAllBookmarkIds(targetType: BookmarkTargetType) {
  const collected = new Set<string>()
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const response = (await fetchBookmarks({
      page,
      limit: 60,
      targetType,
      sortBy: "updatedAt",
      order: "desc",
    })) as BookmarkListResponse

    const bookmarks = response?.result?.bookmarks ?? []
    for (const bookmark of bookmarks) {
      const targetId = getBookmarkTargetId(bookmark?.target)
      if (targetId) {
        collected.add(targetId)
      }
    }

    hasNextPage = Boolean(response?.result?.hasNextPage)
    page += 1

    if (page > 100) {
      break
    }
  }

  return collected
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarkedStrategyIds: new Set(),
  bookmarkedBacktestIds: new Set(),
  updatingStrategyIds: new Set(),
  updatingBacktestIds: new Set(),

  setBookmarkedStrategyId: (strategyId, bookmarked) =>
    set((state) => ({
      bookmarkedStrategyIds: updateIdSet(
        state.bookmarkedStrategyIds,
        strategyId,
        bookmarked
      ),
    })),

  setBookmarkedBacktestId: (backtestId, bookmarked) =>
    set((state) => ({
      bookmarkedBacktestIds: updateIdSet(
        state.bookmarkedBacktestIds,
        backtestId,
        bookmarked
      ),
    })),

  setUpdatingStrategyId: (strategyId, updating) =>
    set((state) => ({
      updatingStrategyIds: updateIdSet(
        state.updatingStrategyIds,
        strategyId,
        updating
      ),
    })),

  setUpdatingBacktestId: (backtestId, updating) =>
    set((state) => ({
      updatingBacktestIds: updateIdSet(
        state.updatingBacktestIds,
        backtestId,
        updating
      ),
    })),

  loadStrategyBookmarks: async () => {
    const accessToken = useAuthStore.getState().accessToken
    if (!accessToken) {
      set({ bookmarkedStrategyIds: new Set() })
      return
    }

    const bookmarkedStrategyIds = await fetchAllBookmarkIds("strategy")
    set({ bookmarkedStrategyIds })
  },

  loadBacktestBookmarks: async () => {
    const accessToken = useAuthStore.getState().accessToken
    if (!accessToken) {
      set({ bookmarkedBacktestIds: new Set() })
      return
    }

    const bookmarkedBacktestIds = await fetchAllBookmarkIds("backtest")
    set({ bookmarkedBacktestIds })
  },

  toggleStrategyBookmark: async (strategyId) => {
    const accessToken = useAuthStore.getState().accessToken
    if (!accessToken) {
      return {
        status: "error",
        message: "Please sign in to bookmark strategies.",
      }
    }

    if (get().updatingStrategyIds.has(strategyId)) {
      return null
    }

    const isBookmarked = get().bookmarkedStrategyIds.has(strategyId)
    get().setUpdatingStrategyId(strategyId, true)

    try {
      if (isBookmarked) {
        // Optimistic unbookmark.
        get().setBookmarkedStrategyId(strategyId, false)

        const response = (await deleteBookmark({
          targetType: "strategy",
          targetId: strategyId,
        })) as BookmarkActionResponse

        return {
          status: "success",
          message: response?.message || "Bookmark removed successfully.",
        }
      }

      const response = (await createBookmark({
        targetType: "strategy",
        target: strategyId,
      })) as BookmarkActionResponse

      get().setBookmarkedStrategyId(strategyId, true)

      return {
        status: "success",
        message: response?.message || "Bookmarked successfully.",
      }
    } catch (error) {
      const status =
        typeof error === "object" && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined

      if (isBookmarked && status === 404) {
        get().setBookmarkedStrategyId(strategyId, false)
        return {
          status: "success",
          message: "Bookmark removed successfully.",
        }
      }

      if (isBookmarked) {
        // Roll back optimistic unbookmark.
        get().setBookmarkedStrategyId(strategyId, true)
        return {
          status: "error",
          message: "Failed to remove bookmark",
        }
      }

      return {
        status: "error",
        message: "Failed to update bookmark",
      }
    } finally {
      get().setUpdatingStrategyId(strategyId, false)
    }
  },

  toggleBacktestBookmark: async (backtestId) => {
    const accessToken = useAuthStore.getState().accessToken
    if (!accessToken) {
      return {
        status: "error",
        message: "Please sign in to bookmark backtests.",
      }
    }

    if (get().updatingBacktestIds.has(backtestId)) {
      return null
    }

    const isBookmarked = get().bookmarkedBacktestIds.has(backtestId)
    get().setUpdatingBacktestId(backtestId, true)

    try {
      if (isBookmarked) {
        get().setBookmarkedBacktestId(backtestId, false)

        const response = (await deleteBookmark({
          targetType: "backtest",
          targetId: backtestId,
        })) as BookmarkActionResponse

        return {
          status: "success",
          message: response?.message || "Bookmark removed successfully.",
        }
      }

      const response = (await createBookmark({
        targetType: "backtest",
        target: backtestId,
      })) as BookmarkActionResponse

      get().setBookmarkedBacktestId(backtestId, true)

      return {
        status: "success",
        message: response?.message || "Bookmarked successfully.",
      }
    } catch (error) {
      const status =
        typeof error === "object" && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined

      if (isBookmarked && status === 404) {
        get().setBookmarkedBacktestId(backtestId, false)
        return {
          status: "success",
          message: "Bookmark removed successfully.",
        }
      }

      if (isBookmarked) {
        get().setBookmarkedBacktestId(backtestId, true)
        return {
          status: "error",
          message: "Failed to remove bookmark",
        }
      }

      return {
        status: "error",
        message: "Failed to update bookmark",
      }
    } finally {
      get().setUpdatingBacktestId(backtestId, false)
    }
  },
}))
