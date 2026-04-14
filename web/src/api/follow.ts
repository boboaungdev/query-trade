import api from "./axios";

export const createFollow = async (userId: string) => {
  const { data } = await api.post(`/follow/${userId}`);
  return data;
};

export const deleteFollow = async (userId: string) => {
  const { data } = await api.delete(`/follow/${userId}`);
  return data;
};

export const fetchFollowStatus = async (userId: string) => {
  const { data } = await api.get(`/follow/status/${userId}`);
  return data;
};
