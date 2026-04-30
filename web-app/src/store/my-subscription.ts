import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getMySubscription, type Subscription } from "@/api/subscription";

type MySubscriptionStoreState = {
  subscription: Subscription | null;
  isLoading: boolean;
  lastFetchedAt: number | null;
  fetchMySubscription: (force?: boolean) => Promise<void>;
  setSubscription: (subscription: Subscription | null) => void;
  clearMySubscription: () => void;
};

let mySubscriptionRequest: Promise<void> | null = null;

export const useMySubscriptionStore = create<MySubscriptionStoreState>()(
  persist(
    (set, get) => ({
      subscription: null,
      isLoading: false,
      lastFetchedAt: null,

      fetchMySubscription: async (force = false) => {
        const { subscription, isLoading } = get();

        if (!force && subscription) {
          return;
        }

        if (isLoading && mySubscriptionRequest) {
          return mySubscriptionRequest;
        }

        set({ isLoading: true });

        mySubscriptionRequest = getMySubscription()
          .then((data) => {
            set({
              subscription: data.subscription,
              isLoading: false,
              lastFetchedAt: Date.now(),
            });
          })
          .catch((error) => {
            set({ isLoading: false });
            throw error;
          })
          .finally(() => {
            mySubscriptionRequest = null;
          });

        return mySubscriptionRequest;
      },

      setSubscription: (subscription) => {
        set({
          subscription,
          lastFetchedAt: subscription ? Date.now() : null,
        });
      },

      clearMySubscription: () => {
        set({
          subscription: null,
          isLoading: false,
          lastFetchedAt: null,
        });
      },
    }),
    {
      name: "my-subscription-store",
      partialize: (state) => ({
        subscription: state.subscription,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
