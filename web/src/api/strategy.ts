import api from "./axios"

const strategyRequestMap = new Map<string, Promise<unknown>>()

export type StrategyCondition =
  | {
      logic: "and" | "or"
      conditions: StrategyCondition[]
    }
  | {
      left: unknown
      operator:
        | ">"
        | "<"
        | ">="
        | "<="
        | "=="
        | "!="
        | "crossAbove"
        | "crossBelow"
      right: unknown
    }

export type StrategyLogicBlock = {
  logic: "and" | "or"
  conditions: StrategyCondition[]
  riskManagement: {
    stopLoss: Record<string, unknown>
    takeProfit: Record<string, unknown>
  }
}

export type CreateStrategyPayload = {
  name: string
  description: string
  isPublic: boolean
  indicators: Array<{
    indicator: string
    key: string
    source: "open" | "high" | "low" | "close" | "volume"
    params: Record<string, unknown>
  }>
  entry: {
    buy: StrategyLogicBlock
    sell: StrategyLogicBlock
  }
}

export type StrategySource = "all" | "mine" | "bookmarked"

function getFetchStrategiesKey({
  page,
  limit,
  search,
  sortBy,
  order,
  source,
  isPublic,
}: {
  page: number
  limit?: number
  search: string
  sortBy: string
  order: string
  source: StrategySource
  isPublic?: boolean
}) {
  return JSON.stringify({
    page,
    limit: limit ?? null,
    search,
    sortBy,
    order,
    source,
    isPublic: isPublic ?? null,
  })
}

export async function fetchStrategies({
  page,
  limit,
  search,
  sortBy,
  order,
  source,
  isPublic,
}: {
  page: number
  limit?: number
  search: string
  sortBy: string
  order: string
  source: StrategySource
  isPublic?: boolean
}) {
  const key = getFetchStrategiesKey({
    page,
    limit,
    search,
    sortBy,
    order,
    source,
    isPublic,
  })

  const existingRequest = strategyRequestMap.get(key)
  if (existingRequest) {
    return existingRequest
  }

  const request = api
    .get("/strategy", {
      params: {
        page,
        limit,
        search,
        sortBy,
        order,
        source,
        isPublic,
      },
    })
    .then(({ data }) => data)
    .finally(() => {
      strategyRequestMap.delete(key)
    })

  strategyRequestMap.set(key, request)

  return request
}

export async function fetchStrategyById(strategyId: string) {
  const key = `strategy:${strategyId}`
  const existingRequest = strategyRequestMap.get(key)
  if (existingRequest) {
    return existingRequest
  }

  const request = api
    .get(`/strategy/${strategyId}`)
    .then(({ data }) => data)
    .finally(() => {
      strategyRequestMap.delete(key)
    })

  strategyRequestMap.set(key, request)
  return request
}

export async function createStrategy(payload: CreateStrategyPayload) {
  const { data } = await api.post("/strategy", payload)
  return data
}

export async function updateStrategy(
  strategyId: string,
  payload: CreateStrategyPayload
) {
  const { data } = await api.patch(`/strategy/${strategyId}`, payload)
  return data
}

export async function deleteStrategy(strategyId: string) {
  const { data } = await api.delete(`/strategy/${strategyId}`)
  return data
}
