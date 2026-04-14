import api from "./axios";

const userRequestMap = new Map<string, Promise<unknown>>();
const userListRequestMap = new Map<string, Promise<unknown>>();

type CommonListParams = {
  page: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: string;
};

function dedupeUserRequest<T>(
  map: Map<string, Promise<unknown>>,
  key: string,
  requestFn: () => Promise<T>,
) {
  const existingRequest = map.get(key);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = requestFn().finally(() => {
    map.delete(key);
  });

  map.set(key, request);
  return request;
}

export async function fetchUserByUsername(username: string) {
  const normalizedUsername = username.trim().toLowerCase();

  return dedupeUserRequest(userRequestMap, normalizedUsername, async () => {
    const { data } = await api.get(`/user/${normalizedUsername}`);
    return data;
  });
}

export async function fetchUserFollowsByUsername(
  username: string,
  params: CommonListParams & {
    type: "followers" | "following";
  },
) {
  const normalizedUsername = username.trim().toLowerCase();
  const key = JSON.stringify({
    username: normalizedUsername,
    ...params,
    limit: params.limit ?? null,
    search: params.search ?? "",
    sortBy: params.sortBy ?? null,
    order: params.order ?? null,
  });

  return dedupeUserRequest(userListRequestMap, key, async () => {
    const { data } = await api.get(`/user/${normalizedUsername}/follows`, {
      params,
    });
    return data;
  });
}

export async function fetchUserStrategiesByUsername(
  username: string,
  params: CommonListParams,
) {
  const normalizedUsername = username.trim().toLowerCase();
  const key = JSON.stringify({
    username: normalizedUsername,
    path: "strategies",
    ...params,
    limit: params.limit ?? null,
    search: params.search ?? "",
    sortBy: params.sortBy ?? null,
    order: params.order ?? null,
  });

  return dedupeUserRequest(userListRequestMap, key, async () => {
    const { data } = await api.get(`/user/${normalizedUsername}/strategies`, {
      params,
    });
    return data;
  });
}

export async function fetchUserBacktestsByUsername(
  username: string,
  params: CommonListParams,
) {
  const normalizedUsername = username.trim().toLowerCase();
  const key = JSON.stringify({
    username: normalizedUsername,
    path: "backtests",
    ...params,
    limit: params.limit ?? null,
    search: params.search ?? "",
    sortBy: params.sortBy ?? null,
    order: params.order ?? null,
  });

  return dedupeUserRequest(userListRequestMap, key, async () => {
    const { data } = await api.get(`/user/${normalizedUsername}/backtests`, {
      params,
    });
    return data;
  });
}
