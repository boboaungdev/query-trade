import api from "./axios"

const userRequestMap = new Map<string, Promise<unknown>>()

type CommonListParams = {
  page: number
  limit?: number
  search?: string
  sortBy?: string
  order?: string
}

export async function fetchUserByUsername(username: string) {
  const normalizedUsername = username.trim().toLowerCase()
  const existingRequest = userRequestMap.get(normalizedUsername)

  if (existingRequest) {
    return existingRequest
  }

  const request = api
    .get(`/user/${normalizedUsername}`)
    .then((response) => response.data)
    .finally(() => {
      userRequestMap.delete(normalizedUsername)
    })

  userRequestMap.set(normalizedUsername, request)
  return request
}

export async function fetchUserFollowsByUsername(
  username: string,
  params: CommonListParams & {
    type: "followers" | "following"
  }
) {
  const { data } = await api.get(`/user/${username}/follows`, { params })
  return data
}

export async function fetchUserStrategiesByUsername(
  username: string,
  params: CommonListParams
) {
  const { data } = await api.get(`/user/${username}/strategies`, { params })
  return data
}

export async function fetchUserBacktestsByUsername(
  username: string,
  params: CommonListParams
) {
  const { data } = await api.get(`/user/${username}/backtests`, { params })
  return data
}
