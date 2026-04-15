import { create } from "zustand";

const ACCESS_TOKEN_KEY = "JWT_ACCESS_TOKEN";
const REFRESH_TOKEN_KEY = "JWT_REFRESH_TOKEN";

export type UserDto = {
  id: string | number;
  email: string;
  fullName?: string | null;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: UserDto | null;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setUser: (user: UserDto | null) => void;
  logout: () => void;
  checkAuth: () => boolean;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,
  setTokens: (accessToken, refreshToken) => {
    if (accessToken && refreshToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    set({ 
      token: accessToken, 
      refreshToken: refreshToken, 
      isAuthenticated: Boolean(accessToken) 
    });
  },
  setUser: (user) => {
    set({ user });
  },
  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ token: null, refreshToken: null, isAuthenticated: false, user: null });
  },
  checkAuth: () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!accessToken || !refreshToken) {
      set({ token: null, refreshToken: null, isAuthenticated: false, user: null });
      return false;
    }
    set({ token: accessToken, refreshToken: refreshToken, isAuthenticated: true });
    return true;
  }
}));
