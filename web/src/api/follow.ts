import api from "./axios"

type FollowListParams = {
  page?: number
  limit?: number
  search?: string
}

export const createFollow = async (userId: string) => {
  const { data } = await api.post(`/follow/${userId}`)
  return data
}

export const deleteFollow = async (userId: string) => {
  const { data } = await api.delete(`/follow/${userId}`)
  return data
}

export const fetchFollowStatus = async (userId: string) => {
  const { data } = await api.get(`/follow/status/${userId}`)
  return data
}

export const fetchFollowers = async (
  userId: string,
  params: FollowListParams = {}
) => {
  const { data } = await api.get(`/follow/followers/${userId}`, { params })
  return data
}

export const fetchFollowing = async (
  userId: string,
  params: FollowListParams = {}
) => {
  const { data } = await api.get(`/follow/following/${userId}`, { params })
  return data
}
