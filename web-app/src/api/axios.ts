import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios"
import { API_URL } from "@/constants"
import { useAuthStore } from "@/store/auth"

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const baseURL = `${API_URL}/api`

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const accessToken =
    useAuthStore.getState().accessToken || localStorage.getItem("accessToken")

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

let refreshRequest: Promise<string | null> | null = null

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function shouldLogoutAfterRefreshFailure(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false
  }

  const status = error.response?.status
  return status === 400 || status === 401 || status === 403 || status === 404
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = axios
      .post(
        `${baseURL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        const result = response.data?.result
        const nextToken = result?.accessToken as string | undefined

        if (!nextToken) {
          throw new Error("Invalid refresh response")
        }

        useAuthStore.getState().setAccessToken(nextToken)
        return nextToken
      })
      .catch((error) => {
        if (shouldLogoutAfterRefreshFailure(error)) {
          useAuthStore.getState().logout()
        }

        throw error
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error as AxiosError).config as
      | RetryableRequestConfig
      | undefined
    const status = error.response?.status

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      error.config?.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const nextToken = await refreshAccessToken()

      if (nextToken) {
        originalRequest.headers = AxiosHeaders.from(originalRequest.headers)
        originalRequest.headers.set("Authorization", `Bearer ${nextToken}`)
      }

      return api(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  }
)

export default api
