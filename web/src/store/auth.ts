import { create } from "zustand"

export type AuthProvider = {
  provider: "google" | "server"
  providerId: string
}

export type User = {
  _id: string
  name: string
  username: string
  email: string
  role: "user" | "admin"
  avatar?: string
  authProviders: AuthProvider[]
  createdAt: string
  updatedAt: string
}

type AuthState = {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  setAuth: (user: User, token: string) => void
  updateUser: (data: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),

  setAuth: (user, token) => {
    localStorage.setItem("user", JSON.stringify(user))
    localStorage.setItem("token", token)

    set({
      user,
      token,
      isAuthenticated: true,
    })
  },

  updateUser: (data) =>
    set((state) => {
      if (!state.user) return state

      const updatedUser = { ...state.user, ...data }

      localStorage.setItem("user", JSON.stringify(updatedUser))

      return {
        user: updatedUser,
      }
    }),

  logout: () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  },
}))
