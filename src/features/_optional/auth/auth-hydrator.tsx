'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/infrastructure/i18n/navigation';
import { ROUTES, stripLocalePrefix } from '@/common/constants/routes';
import { clientEnv } from '@/config/env.client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { routing } from '@/infrastructure/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';

interface AuthHydratorProps {
  children: React.ReactNode;
}

function AuthSessionRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!clientEnv.featureAuth || !isHydrated || !accessToken || !user) {
      return;
    }

    const path = stripLocalePrefix(pathname, [...routing.locales]);
    if (path === ROUTES.login || path === ROUTES.register) {
      router.replace(ROUTES.dashboard);
    }
  }, [isHydrated, accessToken, user, pathname, router]);

  return null;
}

export function AuthHydrator({ children }: AuthHydratorProps) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (clientEnv.featureAuth) {
      void hydrate();
    }
  }, [hydrate]);

  if (clientEnv.featureAuth && !isHydrated) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <>
      <AuthSessionRedirect />
      {children}
    </>
  );
}
