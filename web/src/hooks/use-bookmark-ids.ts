import { useCallback, useState } from "react"

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
  | { status: "success"; message: string; bookmarked: boolean }
  | { status: "error"; message: string }

function getTargetId(target?: BookmarkTargetRef) {
  if (typeof target === "string") {
    return target
  }

  if (typeof target === "object" && target?._id) {
    return target._id
  }

  return ""
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
      const targetId = getTargetId(bookmark?.target)
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

export function useBookmarkIds(targetType: BookmarkTargetType) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  const setBookmarkedId = useCallback((targetId: string, bookmarked: boolean) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (bookmarked) {
        next.add(targetId)
      } else {
        next.delete(targetId)
      }
      return next
    })
  }, [])

  const loadBookmarks = useCallback(async () => {
    if (!accessToken) {
      setBookmarkedIds(new Set())
      return
    }

    const ids = await fetchAllBookmarkIds(targetType)
    setBookmarkedIds(ids)
  }, [accessToken, targetType])

  const toggleBookmark = useCallback(
    async (targetId: string): Promise<ToggleBookmarkResult | null> => {
      if (!accessToken) {
        return {
          status: "error",
          message:
            targetType === "strategy"
              ? "Please sign in to bookmark strategies."
              : "Please sign in to bookmark backtests.",
        }
      }

      if (updatingIds.has(targetId)) {
        return null
      }

      const isBookmarked = bookmarkedIds.has(targetId)

      setUpdatingIds((prev) => new Set(prev).add(targetId))

      try {
        if (isBookmarked) {
          const response = (await deleteBookmark({
            targetType,
            targetId,
          })) as BookmarkActionResponse

          setBookmarkedId(targetId, false)

          return {
            status: "success",
            message: response?.message || "Bookmark removed successfully.",
            bookmarked: false,
          }
        }

        const response = (await createBookmark({
          targetType,
          target: targetId,
        })) as BookmarkActionResponse

        setBookmarkedId(targetId, true)

        return {
          status: "success",
          message: response?.message || "Bookmarked successfully.",
          bookmarked: true,
        }
      } catch (error) {
        const status =
          typeof error === "object" && error !== null
            ? (error as { response?: { status?: number } }).response?.status
            : undefined

        if (isBookmarked && status === 404) {
          setBookmarkedId(targetId, false)
          return {
            status: "success",
            message: "Bookmark removed successfully.",
            bookmarked: false,
          }
        }

        return {
          status: "error",
          message: isBookmarked
            ? "Failed to remove bookmark"
            : "Failed to update bookmark",
        }
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
      }
    },
    [accessToken, bookmarkedIds, setBookmarkedId, targetType, updatingIds]
  )

  return {
    bookmarkedIds,
    updatingIds,
    setBookmarkedId,
    loadBookmarks,
    toggleBookmark,
  }
}
