import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for Token Refresh (Anti-Circular Dependency)
const refreshInternalToken = async (): Promise<string | null> => {
  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) throw new Error('No refresh token');

    // Use a clean axios instance to avoid interceptor loop
    const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });

    const { token: newAccessToken, refreshToken: newRefreshToken, user } = response.data.data;
    useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
    if (user) useAuthStore.getState().setUser(user);
    return newAccessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
};

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const extractMessage = (data: unknown): string | null => {
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (!data || typeof data !== 'object') return null;
  if ('message' in data && typeof (data as { message?: unknown }).message === 'string') {
    return (data as { message: string }).message;
  }
  if ('data' in data) return extractMessage((data as { data?: unknown }).data);
  return null;
};

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data;
    // Standardized unwrapping
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as { data: unknown }).data;
    }
    return payload;
  },
  async (error: AxiosError) => {
    const originalRequest = (error.config ?? {}) as RetriableRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            const headers = AxiosHeaders.from(originalRequest.headers);
            headers.set('Authorization', 'Bearer ' + String(token));
            originalRequest.headers = headers;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshInternalToken();
        isRefreshing = false;
        
        if (newToken) {
          processQueue(null, newToken);
          const headers = AxiosHeaders.from(originalRequest.headers);
          headers.set('Authorization', 'Bearer ' + newToken);
          originalRequest.headers = headers;
          return apiClient(originalRequest);
        }
        
        const err = new Error('Phiên đăng nhập hết hạn');
        processQueue(err, null);
        return Promise.reject(err);
      } catch (err) {
        processQueue(err as Error, null);
        isRefreshing = false;
        return Promise.reject(err);
      }
    }

    // Extract message from Backend GlobalExceptionHandler
    const message = extractMessage(error.response?.data) || 'Đã có lỗi xảy ra';
    return Promise.reject(new Error(message));
  }
);
