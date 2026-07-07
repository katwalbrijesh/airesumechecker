import axios from "axios";

const baseURL = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "https://airesumechecker-backend.onrender.com/api";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error?.message || err.message || "Request failed";
    return Promise.reject({
      status: err.response?.status,
      message,
      details: err.response?.data?.error?.details,
      original: err,
    });
  }
);

