import api from "./axios"

export type BookmarkTargetType = "strategy" | "backtest"

type FetchBookmarksParams = {
  page: number
  limit?: number
  targetType?: BookmarkTargetType
  search?: string
  sortBy?: "createdAt" | "updatedAt"
  order?: "asc" | "desc"
}

const bookmarkRequestCache = new Map<string, Promise<unknown>>()

function getFetchBookmarksKey({
  page,
  limit,
  targetType,
  search,
  sortBy,
  order,
}: FetchBookmarksParams) {
  return JSON.stringify({
    page,
    limit: limit ?? null,
    targetType: targetType ?? null,
    search: search ?? "",
    sortBy: sortBy ?? null,
    order: order ?? null,
  })
}

export async function fetchBookmarks({
  page,
  limit,
  targetType,
  search,
  sortBy,
  order,
}: FetchBookmarksParams) {
  const key = getFetchBookmarksKey({
    page,
    limit,
    targetType,
    search,
    sortBy,
    order,
  })

  const inFlightRequest = bookmarkRequestCache.get(key)
  if (inFlightRequest) {
    return inFlightRequest
  }

  const request = api
    .get("/bookmark", {
      params: {
        page,
        limit,
        targetType,
        search,
        sortBy,
        order,
      },
    })
    .then((response) => response.data)
    .finally(() => {
      bookmarkRequestCache.delete(key)
    })

  bookmarkRequestCache.set(key, request)
  return request
}

export async function createBookmark({
  targetType,
  target,
}: {
  targetType: BookmarkTargetType
  target: string
}) {
  const { data } = await api.post("/bookmark", {
    targetType,
    target,
  })

  return data
}

export async function deleteBookmark({
  targetType,
  targetId,
}: {
  targetType: BookmarkTargetType
  targetId: string
}) {
  const { data } = await api.delete(`/bookmark/${targetType}/${targetId}`)
  return data
}
