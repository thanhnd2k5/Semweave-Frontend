'use client';

import { useAuthStore } from '@/stores/auth-store';
import { clientEnv } from '@/config/env.client';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: clientEnv.featureAuth && !!accessToken && !!user,
    login,
    register,
    logout,
  };
}
