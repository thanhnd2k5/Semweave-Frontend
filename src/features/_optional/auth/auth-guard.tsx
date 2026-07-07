'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from '@/infrastructure/i18n/navigation';
import { ROUTES } from '@/common/constants/routes';
import { clientEnv } from '@/config/env.client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = clientEnv.featureAuth && !!accessToken && !!user;

  useEffect(() => {
    if (!clientEnv.featureAuth || !isHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(ROUTES.login);
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!clientEnv.featureAuth) {
    return <>{children}</>;
  }

  if (!isHydrated || !isAuthenticated) {
    return <LoadingSpinner size="lg" />;
  }

  return <>{children}</>;
}
