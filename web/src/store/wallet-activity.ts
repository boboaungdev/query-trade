import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getWalletActivity, type WalletActivity } from "@/api/wallet";

type WalletActivityPage = {
  activities: WalletActivity[];
  total?: number;
  totalPage?: number;
  currentPage?: number;
  limitPerPage?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

type WalletActivityStoreState = {
  pages: Record<string, WalletActivityPage>;
  isLoading: boolean;
  fetchActivityPage: (params: {
    page: number;
    limit: number;
    force?: boolean;
  }) => Promise<WalletActivityPage>;
  clearActivityCache: () => void;
};

function getActivityCacheKey(page: number, limit: number) {
  return `activity:${page}:${limit}`;
}

const walletActivityRequestCache = new Map<string, Promise<WalletActivityPage>>();

export const useWalletActivityStore = create<WalletActivityStoreState>()(
  persist(
    (set, get) => ({
      pages: {},
      isLoading: false,

      fetchActivityPage: async ({ page, limit, force = false }) => {
        const cacheKey = getActivityCacheKey(page, limit);
        const cachedPage = get().pages[cacheKey];

        if (!force && cachedPage) {
          return cachedPage;
        }

        const existingRequest = walletActivityRequestCache.get(cacheKey);

        if (existingRequest) {
          return existingRequest;
        }

        set({ isLoading: true });

        const request = getWalletActivity({ page, limit })
          .then((data) => {
            set((state) => ({
              pages: {
                ...state.pages,
                [cacheKey]: data,
              },
              isLoading: false,
            }));

            return data;
          })
          .catch((error) => {
            set({ isLoading: false });
            throw error;
          })
          .finally(() => {
            walletActivityRequestCache.delete(cacheKey);
          });

        walletActivityRequestCache.set(cacheKey, request);
        return request;
      },

      clearActivityCache: () => {
        set({
          pages: {},
          isLoading: false,
        });
        walletActivityRequestCache.clear();
      },
    }),
    {
      name: "wallet-activity-store",
      partialize: (state) => ({
        pages: Object.fromEntries(
          Object.entries(state.pages).filter(([key]) => key.startsWith("activity:1:")),
        ),
      }),
    },
  ),
);
