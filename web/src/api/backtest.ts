import api from "./axios"

export type BacktestTrade = {
  symbol: string
  side: string
  status: string
  amount: number
  amountInUSD: number
  entryFee: number
  entryPrice: number
  entryTime: number
  exitFee: number
  exitPrice: number
  exitTime: number
  totalFees: number
  duration: number
  pnl: number
  pnlPercent: number
}

export type BacktestEquityPoint = {
  timestamp: number
  equity: number
}

export type BacktestResult = {
  startTime: number
  endTime: number
  initialBalance: number
  finalBalance: number
  totalPnL: number
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  grossProfit: number
  grossLoss: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  averageTradePnL: number
  maxWin: number
  maxLoss: number
  totalFees: number
  maxDrawdown: number
  maxDrawdownPercent: number
  equityCurves: BacktestEquityPoint[]
  trades: BacktestTrade[]
}

export type RunBacktestPayload = {
  exchange: string
  symbol: string
  timeframe: string
  startTime: string
  endTime: string
  initialBalance: number
  amountPerTrade: number
  marketType: string
  entryOrderType: string
  exitOrderType: string
  strategy: unknown
}

export type RunBacktestResponse = {
  status: boolean
  message: string
  result: {
    backtest: BacktestResult
  }
}

export type ExchangeSupportedDataResponse = {
  status: boolean
  message: string
  result: {
    data: {
      symbols: string[]
      timeframes: Record<string, string>
    }
  }
}

export async function runBacktest(payload: RunBacktestPayload) {
  const { data } = await api.post<RunBacktestResponse>("/backtest/run", payload)

  return data
}

export async function exchangeSupportedData({
  exchange,
  marketType,
}: {
  exchange: string
  marketType: string
}) {
  const { data } = await api.post<ExchangeSupportedDataResponse>(
    "/backtest/exchange-supported-data",
    {
      exchange,
      marketType,
    }
  )

  return data
}
