import axios from "axios";

export const axiosAPI = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  paramsSerializer: {
    encode: (param: string | number) => param,
  },
});

axiosAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("unify_chat_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
