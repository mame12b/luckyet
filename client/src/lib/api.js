
import axios from "axios";
import { useAuthStore } from "../store/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    const code = err.response?.data?.code;

    // Hard fail — session is dead, no retry, force re-login
    if (status === 401 && code === "IDLE_TIMEOUT") {
      useAuthStore.getState().clear();
      // Show user-facing message via a global event the Layout can catch
      window.dispatchEvent(new CustomEvent("session-expired", {
        detail: { reason: "idle" }
      }));
      return Promise.reject(err);
    }

    // Token-expired → try to refresh once
    if (
      status === 401 &&
      code === "TOKEN_EXPIRED" &&
      !original._retry
    ) {
      original._retry = true;
      try {
        refreshing ??= axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { data } = await refreshing;
        refreshing = null;
        useAuthStore.getState().setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshing = null;
        useAuthStore.getState().clear();
        window.dispatchEvent(new CustomEvent("session-expired", {
          detail: { reason: "expired" }
        }));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
