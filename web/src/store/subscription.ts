import { create } from "zustand";

import {
  getSubscriptionPlans,
  type SubscriptionPlan,
} from "@/api/subscription";

type SubscriptionStoreState = {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  lastFetchedAt: number | null;
  fetchPlans: (force?: boolean) => Promise<void>;
  clearPlansCache: () => void;
};

let subscriptionPlansRequest: Promise<void> | null = null;

export const useSubscriptionStore = create<SubscriptionStoreState>(
  (set, get) => ({
    plans: [],
    isLoading: false,
    lastFetchedAt: null,

    fetchPlans: async (force = false) => {
      const { plans, isLoading } = get();

      if (!force && plans.length > 0) {
        return;
      }

      if (isLoading && subscriptionPlansRequest) {
        return subscriptionPlansRequest;
      }

      set({ isLoading: true });

      subscriptionPlansRequest = getSubscriptionPlans()
        .then((data) => {
          set({
            plans: data.plans,
            isLoading: false,
            lastFetchedAt: Date.now(),
          });
        })
        .catch((error) => {
          set({ isLoading: false });
          throw error;
        })
        .finally(() => {
          subscriptionPlansRequest = null;
        });

      return subscriptionPlansRequest;
    },

    clearPlansCache: () => {
      set({
        plans: [],
        isLoading: false,
        lastFetchedAt: null,
      });
    },
  }),
);
