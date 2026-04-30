import { create } from "zustand";

import type { UserMembership } from "@/components/user-membership";
import { useMySubscriptionStore } from "@/store/my-subscription";
import { useSubscriptionStore } from "@/store/subscription";
import { useWalletActivityStore } from "@/store/wallet-activity";
import { useWalletStore } from "@/store/wallet";

export type AuthProvider = {
  provider: "google" | "server";
  providerId: string;
};

export type User = {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: "user" | "admin";
  tokenBalance?: number;
  preferences?: {
    hideWalletBalance?: boolean;
    showWalletBalance?: boolean;
  };
  avatar?: string;
  bio?: string;
  membership?: UserMembership;
  passwordChangedAt?: string;
  authProviders: AuthProvider[];
  stats?: {
    followerCount?: number;
    followingCount?: number;
    strategyCount?: number;
    backtestCount?: number;
  };
  createdAt: string;
  updatedAt: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  accessToken: localStorage.getItem("accessToken"),
  isAuthenticated: !!localStorage.getItem("accessToken"),

  setAuth: (user, accessToken) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("accessToken", accessToken);

    set({
      user,
      accessToken,
      isAuthenticated: true,
    });
  },

  setAccessToken: (accessToken) => {
    localStorage.setItem("accessToken", accessToken);

    set((state) => ({
      user: state.user,
      accessToken,
      isAuthenticated: true,
    }));
  },

  updateUser: (data) =>
    set((state) => {
      if (!state.user) return state;

      const updatedUser = { ...state.user, ...data };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      return {
        user: updatedUser,
      };
    }),

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");

    useSubscriptionStore.getState().clearPlansCache();
    useSubscriptionStore.persist.clearStorage();

    useMySubscriptionStore.getState().clearMySubscription();
    useMySubscriptionStore.persist.clearStorage();

    useWalletStore.getState().clearWallet();
    useWalletStore.persist.clearStorage();

    useWalletActivityStore.getState().clearActivityCache();
    useWalletActivityStore.persist.clearStorage();

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));
