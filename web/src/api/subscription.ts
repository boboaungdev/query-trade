import api from "./axios"

export type SortOrder = "asc" | "desc"
export type AdminPlanSortBy =
  | "sortOrder"
  | "name"
  | "amountUsd"
  | "durationDays"
  | "createdAt"
export type PlanId = string
export type PayCurrency = "usdtbsc"
export type SubscriptionStatus = "active" | "expired" | "pending"
export type PaymentStatus = "pending" | "confirmed" | "failed" | "expired"

export type SubscriptionPlan = {
  _id: string
  id: PlanId
  key: PlanId
  name: string
  amountUsd: number
  originalAmountUsd: number
  discountAmountUsd: number
  hasDiscount: boolean
  discount?: {
    isActive?: boolean
    type?: "percentage" | "fixed"
    value?: number
    label?: string
    startsAt?: string | null
    endsAt?: string | null
  }
  durationDays: number
  features: string[]
  isActive: boolean
  sortOrder: number
}

export type PaymentCurrencyOption = {
  id: PayCurrency
  label: string
  network: string
  description: string
}

export type Subscription = {
  plan: PlanId
  status: SubscriptionStatus
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
}

export type Payment = {
  _id: string
  plan: PlanId
  amountUsd: number
  planSnapshot?: {
    key?: PlanId
    name?: string
    originalAmountUsd?: number
    discountAmountUsd?: number
    finalAmountUsd?: number
    durationDays?: number
    discount?: SubscriptionPlan["discount"]
  }
  status: PaymentStatus
  providerStatus?: string
  payAddress?: string
  payAmount?: number
  payCurrency: PayCurrency
  txHash?: string
  txFrom?: string
  txBlockNumber?: number
  createdAt: string
  confirmedAt?: string
}

export async function getSubscriptionPlans() {
  const { data } = await api.get<{
    result: {
      plans: SubscriptionPlan[]
      currencies: PaymentCurrencyOption[]
    }
  }>("/subscription/plans")

  return data.result
}

export async function getMySubscription() {
  const { data } = await api.get<{
    result: {
      subscription: Subscription
      latestPayment?: Payment | null
    }
  }>("/subscription/me")

  return data.result
}

export async function getPaymentHistory() {
  const { data } = await api.get<{
    result: {
      payments: Payment[]
    }
  }>("/subscription/payments")

  return data.result
}

export async function getPayment(paymentId: string) {
  const { data } = await api.get<{
    result: {
      payment: Payment
    }
  }>(`/subscription/payments/${paymentId}`)

  return data.result
}

export async function createSubscriptionCheckout({
  plan,
  payCurrency,
}: {
  plan: Exclude<PlanId, "free">
  payCurrency: PayCurrency
}) {
  const { data } = await api.post<{
    result: {
      payment: Payment
      mock?: boolean
      manualPayment?: boolean
      subscription?: Subscription
    }
  }>("/subscription/checkout", {
    plan,
    payCurrency,
  })

  return data.result
}

export async function verifySubscriptionPayment({
  paymentId,
  txHash,
}: {
  paymentId: string
  txHash: string
}) {
  const { data } = await api.post<{
    result: {
      payment: Payment
      subscription?: Subscription
    }
  }>(`/subscription/payments/${paymentId}/verify`, {
    txHash,
  })

  return data.result
}

export type SubscriptionPlanPayload = {
  key?: PlanId
  name?: string
  amountUsd?: number
  durationDays?: number
  features?: string[]
  discount?: SubscriptionPlan["discount"]
  isActive?: boolean
  sortOrder?: number
}

export async function getAdminSubscriptionPlans({
  page,
  limit,
  search,
  sortBy,
  order,
}: {
  page?: number
  limit?: number
  search?: string
  sortBy?: AdminPlanSortBy
  order?: SortOrder
} = {}) {
  const { data } = await api.get<{
    result: {
      plans: SubscriptionPlan[]
      total?: number
      totalPage?: number
      currentPage?: number
      limitPerPage?: number
      hasNextPage?: boolean
      hasPrevPage?: boolean
    }
  }>("/subscription/admin/plans", {
    params: {
      page,
      limit,
      search,
      sortBy,
      order,
    },
  })

  return data.result
}

export async function createAdminSubscriptionPlan(payload: SubscriptionPlanPayload) {
  const { data } = await api.post<{
    result: {
      plan: SubscriptionPlan
    }
  }>("/subscription/admin/plans", payload)

  return data.result
}

export async function updateAdminSubscriptionPlan({
  planId,
  payload,
}: {
  planId: string
  payload: SubscriptionPlanPayload
}) {
  const { data } = await api.patch<{
    result: {
      plan: SubscriptionPlan
    }
  }>(`/subscription/admin/plans/${planId}`, payload)

  return data.result
}

export async function deactivateAdminSubscriptionPlan(planId: string) {
  const { data } = await api.delete<{
    result: {
      plan: SubscriptionPlan
    }
  }>(`/subscription/admin/plans/${planId}`)

  return data.result
}
