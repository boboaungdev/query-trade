import api from "./axios"

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
