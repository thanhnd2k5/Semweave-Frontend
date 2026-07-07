'use client';

import { create } from 'zustand';
import { clearSessionCookie, setSessionCookie } from '@/common/auth/session-cookie';
import { clientEnv } from '@/config/env.client';
import type { AuthTokens, UserProfile } from '@/common/types/api.types';
import { api, setAuthStoreGetter } from '@/lib/api-client';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isHydrated: boolean;
  isLoading: boolean;

  setAuth: (accessToken: string, user: UserProfile) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchProfile: () => Promise<UserProfile>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  async function authenticate(
    endpoint: '/auth/login' | '/auth/register',
    email: string,
    password: string,
  ) {
    set({ isLoading: true });
    try {
      const tokens = await api.post<AuthTokens>(endpoint, { email, password });
      set({ accessToken: tokens.accessToken });
      const user = await get().fetchProfile();
      get().setAuth(tokens.accessToken, user);
    } finally {
      set({ isLoading: false });
    }
  }

  return {
    user: null,
    accessToken: null,
    isHydrated: false,
    isLoading: false,

    setAuth: (accessToken, user) => {
      setSessionCookie();
      set({ accessToken, user });
    },

    clearAuth: () => {
      clearSessionCookie();
      set({ accessToken: null, user: null });
    },

    hydrate: async () => {
      if (!clientEnv.featureAuth) {
        set({ isHydrated: true });
        return;
      }

      try {
        await get().refreshToken();
        const user = await get().fetchProfile();
        const token = get().accessToken;
        if (token) {
          get().setAuth(token, user);
        }
        set({ isHydrated: true });
      } catch {
        get().clearAuth();
        set({ isHydrated: true });
      }
    },

    login: (email, password) => authenticate('/auth/login', email, password),
    register: (email, password) => authenticate('/auth/register', email, password),

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } finally {
        get().clearAuth();
      }
    },

    refreshToken: async () => {
      const tokens = await api.post<AuthTokens>('/auth/refresh');
      setSessionCookie();
      set({ accessToken: tokens.accessToken });
    },

    fetchProfile: async () => {
      const user = await api.get<UserProfile>('/users/me');
      set({ user });
      return user;
    },
  };
});

setAuthStoreGetter(() => ({
  accessToken: useAuthStore.getState().accessToken,
  refreshToken: () => useAuthStore.getState().refreshToken(),
  clearAuth: () => useAuthStore.getState().clearAuth(),
}));
