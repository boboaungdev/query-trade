import api from "./axios"

export type IndicatorCategory =
  | "trend"
  | "momentum"
  | "volatility"
  | "volume"
  | "support_resistance"

export type IndicatorSource = "open" | "high" | "low" | "close" | "volume"

export type Indicator = {
  _id: string
  name: string
  description: string
  category: IndicatorCategory
  source: IndicatorSource
  params: Record<string, number | boolean>
}

export type IndicatorPayload = {
  name?: string
  description?: string
  category?: IndicatorCategory
  source?: IndicatorSource
  params?: Record<string, number | boolean>
}

export async function fetchIndicators({
  page,
  limit,
  search,
  sortBy,
  order,
  category,
}: {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  order?: string
  category?: string
}) {
  const { data } = await api.get("/indicator", {
    params: {
      page,
      limit,
      search,
      sortBy,
      order,
      category,
    },
  })

  return data
}

export async function createIndicator(payload: Required<IndicatorPayload>) {
  const { data } = await api.post<{
    result: {
      indicator: Indicator
    }
  }>("/indicator", payload)

  return data.result
}

export async function updateIndicator({
  indicatorId,
  payload,
}: {
  indicatorId: string
  payload: IndicatorPayload
}) {
  const { data } = await api.patch<{
    result: {
      indicator: Indicator
    }
  }>(`/indicator/${indicatorId}`, payload)

  return data.result
}

export async function deleteIndicator(indicatorId: string) {
  const { data } = await api.delete<{
    result: {
      indicator: Indicator
    }
  }>(`/indicator/${indicatorId}`)

  return data.result
}
