import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  getWalletSummary,
  type Payment,
  type WalletSummaryStats,
} from "@/api/wallet";

type WalletSummary = Awaited<ReturnType<typeof getWalletSummary>>;

type WalletStoreState = {
  tokenBalance: number | null;
  tokenPerUsd: number | null;
  latestPayment: Payment | null;
  stats: WalletSummaryStats | null;
  isLoading: boolean;
  lastFetchedAt: number | null;
  fetchWalletSummary: (force?: boolean) => Promise<WalletSummary>;
  setWalletSummary: (data: Partial<WalletSummary>) => void;
  clearWallet: () => void;
};

let walletSummaryRequest: Promise<WalletSummary> | null = null;

export const useWalletStore = create<WalletStoreState>()(
  persist(
    (set, get) => ({
      tokenBalance: null,
      tokenPerUsd: null,
      latestPayment: null,
      stats: null,
      isLoading: false,
      lastFetchedAt: null,

      fetchWalletSummary: async (force = false) => {
        const { tokenBalance, tokenPerUsd, latestPayment, stats, isLoading } =
          get();

        if (
          !force &&
          tokenBalance !== null &&
          tokenPerUsd !== null &&
          stats !== null
        ) {
          return {
            tokenBalance,
            tokenPerUsd,
            latestPayment,
            stats,
          };
        }

        if (isLoading && walletSummaryRequest) {
          return walletSummaryRequest;
        }

        set({ isLoading: true });

        walletSummaryRequest = getWalletSummary()
          .then((data) => {
            set({
              tokenBalance: Number(data.tokenBalance ?? 0),
              tokenPerUsd: data.tokenPerUsd ?? 1000,
              latestPayment: data.latestPayment ?? null,
              stats: data.stats ?? null,
              isLoading: false,
              lastFetchedAt: Date.now(),
            });

            return data;
          })
          .catch((error) => {
            set({ isLoading: false });
            throw error;
          })
          .finally(() => {
            walletSummaryRequest = null;
          });

        return walletSummaryRequest;
      },

      setWalletSummary: (data) => {
        set((state) => ({
          tokenBalance:
            typeof data.tokenBalance === "number"
              ? data.tokenBalance
              : state.tokenBalance,
          tokenPerUsd:
            typeof data.tokenPerUsd === "number"
              ? data.tokenPerUsd
              : state.tokenPerUsd,
          latestPayment:
            "latestPayment" in data
              ? (data.latestPayment ?? null)
              : state.latestPayment,
          stats: data.stats ?? state.stats,
          lastFetchedAt: Date.now(),
        }));
      },

      clearWallet: () => {
        set({
          tokenBalance: null,
          tokenPerUsd: null,
          latestPayment: null,
          stats: null,
          isLoading: false,
          lastFetchedAt: null,
        });
      },
    }),
    {
      name: "wallet-store",
      partialize: (state) => ({
        tokenBalance: state.tokenBalance,
        tokenPerUsd: state.tokenPerUsd,
        latestPayment: state.latestPayment,
        stats: state.stats,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
