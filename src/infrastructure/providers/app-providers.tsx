'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clientEnv } from '@/config/env.client';
import { OfflineProvider } from '@/features/_optional/offline/offline-provider';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { clearPrivateQueryCache } from '@/lib/private-query';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  const content = (
    <QueryClientProvider client={queryClient}>
      <AuthQueryCacheBoundary />
      {children}
    </QueryClientProvider>
  );

  if (clientEnv.featureOffline) {
    return <OfflineProvider>{content}</OfflineProvider>;
  }

  return content;
}

function AuthQueryCacheBoundary() {
  const queryClient = useQueryClient();
  const identity = useQueryIdentity();
  const previousIdentity = useRef(identity);

  useEffect(() => {
    if (previousIdentity.current === identity) return;

    const identityToClear = previousIdentity.current;
    previousIdentity.current = identity;
    void clearPrivateQueryCache(queryClient, identityToClear);
  }, [identity, queryClient]);

  return null;
}
