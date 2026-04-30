import api from "./axios"

const exchangeDataRequestMap = new Map<string, Promise<unknown>>()
const backtestRequestMap = new Map<string, Promise<unknown>>()
const backtestLeaderboardRequestMap = new Map<string, Promise<unknown>>()

type FetchBacktestLeaderboardParams = {
  page: number
  limit?: number
  search: string
  source: "all" | "me"
  duration: "all" | "7d" | "1m" | "3m" | "6m" | "1y"
  timeframe?: string
  sortBy: string
  order: string
}

function getFetchBacktestLeaderboardKey({
  page,
  limit,
  search,
  source,
  duration,
  timeframe,
  sortBy,
  order,
}: FetchBacktestLeaderboardParams) {
  return JSON.stringify({
    page,
    limit: limit ?? null,
    search,
    source,
    duration,
    timeframe: timeframe ?? null,
    sortBy,
    order,
  })
}

export async function fetchExchangeData({
  exchange,
}: { exchange?: string } = {}) {
  const key = JSON.stringify({ exchange: exchange ?? null })

  const existingRequest = exchangeDataRequestMap.get(key)
  if (existingRequest) {
    return existingRequest
  }

  const request = api
    .get("/backtest/exchange-data", {
      params: {
        exchange,
      },
    })
    .then(({ data }) => data)
    .finally(() => {
      exchangeDataRequestMap.delete(key)
    })

  exchangeDataRequestMap.set(key, request)

  return request
}

type RunBacktestParams = {
  exchange?: string
  symbol: string
  timeframe: string
  startDate: string
  endDate: string
  amountPerTrade: number
  initialBalance: number
  entryFeeRate: number
  exitFeeRate: number
  strategyId: string
  hedgeMode: boolean
}

function clearBacktestRequestCache(backtestId?: string) {
  if (backtestId) {
    backtestRequestMap.delete(backtestId)
    return
  }

  backtestRequestMap.clear()
}

export const runBacktest = async (body: RunBacktestParams) => {
  const { data } = await api.post("/backtest", body)
  return data
}

export const updateBacktest = async (
  backtestId: string,
  body: RunBacktestParams
) => {
  const { data } = await api.patch(`/backtest/${backtestId}`, body)
  clearBacktestRequestCache(backtestId)
  return data
}

export const deleteBacktest = async (backtestId: string) => {
  const { data } = await api.delete(`/backtest/${backtestId}`)
  clearBacktestRequestCache(backtestId)
  return data
}

export async function fetchBacktestLeaderboard({
  page,
  limit,
  search,
  source,
  duration,
  timeframe,
  sortBy,
  order,
}: FetchBacktestLeaderboardParams) {
  const key = getFetchBacktestLeaderboardKey({
    page,
    limit,
    search,
    source,
    duration,
    timeframe,
    sortBy,
    order,
  })

  const existingRequest = backtestLeaderboardRequestMap.get(key)
  if (existingRequest) {
    return existingRequest
  }

  const request = api
    .get("/backtest", {
      params: {
        page,
        limit,
        search,
        source,
        duration,
        timeframe,
        sortBy,
        order,
      },
    })
    .then(({ data }) => data)
    .finally(() => {
      backtestLeaderboardRequestMap.delete(key)
    })

  backtestLeaderboardRequestMap.set(key, request)

  return request
}

export const fetchBacktestById = async (backtestId: string) => {
  const existingRequest = backtestRequestMap.get(backtestId)
  if (existingRequest) {
    return existingRequest
  }

  const request = api
    .get(`/backtest/${backtestId}`)
    .then(({ data }) => data)
    .finally(() => {
      backtestRequestMap.delete(backtestId)
    })

  backtestRequestMap.set(backtestId, request)

  return request
}
