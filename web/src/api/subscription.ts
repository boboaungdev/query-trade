import api from "./axios";

export type SortOrder = "asc" | "desc";
export type AdminPlanSortBy =
  | "sortOrder"
  | "name"
  | "amountToken"
  | "durationDays"
  | "createdAt";
export type PlanId = string;
export type SubscriptionStatus = "active" | "expired" | "pending";

export type SubscriptionPlan = {
  _id: string;
  id: PlanId;
  key: PlanId;
  name: string;
  amountToken: number;
  originalAmountToken: number;
  discountAmountToken: number;
  hasDiscount: boolean;
  discount?: {
    isActive?: boolean;
    type?: "percentage" | "fixed";
    value?: number;
    label?: string;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  durationDays: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
};

export type Subscription = {
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
};

export type SubscriptionWalletTransaction = {
  _id: string;
  type: "deposit" | "spend" | "refund" | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  planKey?: string;
  createdAt: string;
};

export async function getSubscriptionPlans() {
  const { data } = await api.get<{
    result: {
      plans: SubscriptionPlan[];
    };
  }>("/subscription/plans");

  return data.result;
}

export async function getMySubscription() {
  const { data } = await api.get<{
    result: {
      subscription: Subscription;
    };
  }>("/subscription/me");

  return data.result;
}

export async function createSubscriptionCheckout({
  plan,
}: {
  plan: Exclude<PlanId, "free">;
}) {
  const { data } = await api.post<{
    result: {
      subscription: Subscription;
      membership?: {
        plan?: "free" | "plus" | "pro" | string;
        badgeLabel?: string | null;
        badgeVariant?: "free" | "plus" | "pro" | string;
        verifiedVariant?: "free" | "plus" | "pro" | string;
        title?: string | null;
        description?: string | null;
      };
      walletTransaction: SubscriptionWalletTransaction;
      tokenBalance: number;
    };
  }>("/subscription/checkout", {
    plan,
  });

  return data.result;
}

export type SubscriptionPlanPayload = {
  key?: PlanId;
  name?: string;
  amountToken?: number;
  durationDays?: number;
  features?: string[];
  discount?: SubscriptionPlan["discount"];
  isActive?: boolean;
  sortOrder?: number;
};

export async function getAdminSubscriptionPlans({
  page,
  limit,
  search,
  sortBy,
  order,
}: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: AdminPlanSortBy;
  order?: SortOrder;
} = {}) {
  const { data } = await api.get<{
    result: {
      plans: SubscriptionPlan[];
      total?: number;
      totalPage?: number;
      currentPage?: number;
      limitPerPage?: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
  }>("/subscription/admin/plans", {
    params: {
      page,
      limit,
      search,
      sortBy,
      order,
    },
  });

  return data.result;
}

export async function createAdminSubscriptionPlan(
  payload: SubscriptionPlanPayload,
) {
  const { data } = await api.post<{
    result: {
      plan: SubscriptionPlan;
    };
  }>("/subscription/admin/plans", payload);

  return data.result;
}

export async function updateAdminSubscriptionPlan({
  planId,
  payload,
}: {
  planId: string;
  payload: SubscriptionPlanPayload;
}) {
  const { data } = await api.patch<{
    result: {
      plan: SubscriptionPlan;
    };
  }>(`/subscription/admin/plans/${planId}`, payload);

  return data.result;
}

export async function deleteAdminSubscriptionPlan(planId: string) {
  const { data } = await api.delete<{
    result: {
      plan: SubscriptionPlan;
    };
  }>(`/subscription/admin/plans/${planId}`);

  return data.result;
}
