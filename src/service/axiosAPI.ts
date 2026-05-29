import axios from "axios";

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc5MjUyMjc3LCJpYXQiOjE3Nzg4MjAyNzcsImp0aSI6IjJlNWRjNTg0ZDllODRmY2JiYmJjMzRlYjlhMTY0MjkyIiwidXNlcl9pZCI6IjEiLCJyb2xlIjoiQWRtaW5pc3RyYXRvciIsInByb2plY3QiOiJtX2dheiJ9.Smtcy3uvzgf0d29icsJrP7sNv6qHmguEBpGsv15aFN8

export const axiosAPI = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  paramsSerializer: {
    encode: (param: string | number) => param,
  },
});

// m-gaz
// Auth header
// axiosAPI.interceptors.request.use((config) => {
//   const token =
//     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc5MjUyMjc3LCJpYXQiOjE3Nzg4MjAyNzcsImp0aSI6IjJlNWRjNTg0ZDllODRmY2JiYmJjMzRlYjlhMTY0MjkyIiwidXNlcl9pZCI6IjEiLCJyb2xlIjoiQWRtaW5pc3RyYXRvciIsInByb2plY3QiOiJtX2dheiJ9.Smtcy3uvzgf0d29icsJrP7sNv6qHmguEBpGsv15aFN8";
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// e-komplektasiya
axiosAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("unify_chat_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
