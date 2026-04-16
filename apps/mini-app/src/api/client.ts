import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.yumoff.site/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (!refreshToken) { logout(); return Promise.reject(error); }

      const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      setTokens(data.access_token, data.refresh_token);
      refreshQueue.forEach((cb) => cb(data.access_token));
      refreshQueue = [];

      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
