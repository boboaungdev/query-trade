import api from "./axios"

export type IndicatorRecord = {
  _id: string
  name: string
  fullName: string
  category: string
  source: string
  params: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type GetIndicatorsResponse = {
  status: boolean
  message: string
  result: {
    total: number
    totalPage: number
    currentPage: number
    limitPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
    indicators: IndicatorRecord[]
  }
}

export async function getIndicators() {
  const { data } = await api.get<GetIndicatorsResponse>("/indicator")

  return data
}
