import api from "./axios";

export type SortOrder = "asc" | "desc";
export type AdminPlanSortBy =
  | "sortOrder"
  | "name"
  | "amountToken"
  | "durationDays"
  | "createdAt";
export type PlanId = string;
export type PayCurrency = "usdtbsc";
export type SubscriptionStatus = "active" | "expired" | "pending";
export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "failed"
  | "expired";

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

export type PaymentCurrencyOption = {
  id: PayCurrency;
  label: string;
  network: string;
  description: string;
};

export type Subscription = {
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
};

export type Payment = {
  _id: string;
  purpose: "token_topup";
  requestedAmountUsdt: number;
  tokenAmount: number;
  rateSnapshot: number;
  status: PaymentStatus;
  providerStatus?: string;
  payAddress?: string;
  payCurrencyAmount?: number;
  payCurrency: PayCurrency;
  txHash?: string;
  providerReference?: string;
  txFrom?: string;
  txBlockNumber?: number;
  confirmedAmountUsdt?: number;
  createdAt: string;
  confirmedAt?: string;
};

export type WalletTransaction = {
  _id: string;
  type: "deposit" | "spend" | "refund" | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  planKey?: string;
  createdAt: string;
};

export type WalletActivity = {
  _id: string;
  sourceType: "payment" | "wallet_transaction";
  activityType:
    | "deposit"
    | "subscription"
    | "withdraw"
    | "transfer"
    | "refund"
    | "adjustment"
    | "spend";
  status: PaymentStatus | "completed";
  amountUsd?: number;
  tokenAmount: number;
  rateSnapshot?: number;
  payCurrency?: PayCurrency;
  txHash?: string | null;
  balanceBefore?: number;
  balanceAfter?: number;
  plan?: string | null;
  description?: string;
  createdAt: string;
  confirmedAt?: string | null;
};

export async function getSubscriptionPlans() {
  const { data } = await api.get<{
    result: {
      plans: SubscriptionPlan[];
      currencies: PaymentCurrencyOption[];
      tokenPerUsdt: number;
    };
  }>("/subscription/plans");

  return data.result;
}

export async function getMySubscription() {
  const { data } = await api.get<{
    result: {
      subscription: Subscription;
      latestPayment?: Payment | null;
      tokenBalance: number;
      tokenPerUsdt: number;
    };
  }>("/subscription/me");

  return data.result;
}

export async function getPaymentHistory({
  page,
  limit,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const { data } = await api.get<{
    result: {
      payments: Payment[];
      total?: number;
      totalPage?: number;
      currentPage?: number;
      limitPerPage?: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
  }>("/subscription/payments", {
    params: {
      page,
      limit,
    },
  });

  return data.result;
}

export async function getWalletActivity({
  page,
  limit,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const { data } = await api.get<{
    result: {
      activities: WalletActivity[];
      total?: number;
      totalPage?: number;
      currentPage?: number;
      limitPerPage?: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
  }>("/subscription/activity", {
    params: {
      page,
      limit,
    },
  });

  return data.result;
}

export async function getPayment(paymentId: string) {
  const { data } = await api.get<{
    result: {
      payment: Payment;
    };
  }>(`/subscription/payments/${paymentId}`);

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
      walletTransaction: WalletTransaction;
      tokenBalance: number;
    };
  }>("/subscription/checkout", {
    plan,
  });

  return data.result;
}

export async function createTokenDeposit({
  amountUsdt,
  payCurrency,
}: {
  amountUsdt: number;
  payCurrency: PayCurrency;
}) {
  const { data } = await api.post<{
    result: {
      payment: Payment;
    };
  }>("/subscription/deposits", {
    amountUsdt,
    payCurrency,
  });

  return data.result;
}

export async function verifySubscriptionPayment({
  paymentId,
  txHash,
}: {
  paymentId: string;
  txHash: string;
}) {
  const { data } = await api.post<{
    result: {
      payment: Payment;
      walletTransaction?: WalletTransaction;
      tokenBalance?: number;
    };
  }>(`/subscription/payments/${paymentId}/verify`, {
    txHash,
  });

  return data.result;
}

export async function cancelSubscriptionPayment(paymentId: string) {
  const { data } = await api.post<{
    result: {
      payment: Payment;
    };
  }>(`/subscription/payments/${paymentId}/cancel`);

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
