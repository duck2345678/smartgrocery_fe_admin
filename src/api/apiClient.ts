import axios, { AxiosError } from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: API_URL
});

// Helper for Token Refresh (Anti-Circular Dependency)
const refreshInternalToken = async (): Promise<string | null> => {
  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) throw new Error("No refresh token");

    // Use a clean axios instance to avoid interceptor loop
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });

    const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
    useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
    return newAccessToken;
  } catch (error) {
    useAuthStore.getState().logout();
    return null;
  }
};

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

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

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data;
    // Standardized unwrapping
    if (payload && typeof payload === "object" && "data" in payload) {
      return payload.data;
    }
    return payload;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
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
          originalRequest.headers["Authorization"] = "Bearer " + newToken;
          return apiClient(originalRequest);
        }
        
        const err = new Error("Phiên đăng nhập hết hạn");
        processQueue(err, null);
        return Promise.reject(err);
      } catch (err) {
        processQueue(err as Error, null);
        isRefreshing = false;
        return Promise.reject(err);
      }
    }

    // Extract message from Backend GlobalExceptionHandler
    const backendData = error.response?.data as any;
    const message = backendData?.message || "Đã có lỗi xảy ra";
    return Promise.reject(new Error(message));
  }
);
