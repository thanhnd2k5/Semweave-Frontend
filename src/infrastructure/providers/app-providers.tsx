'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { LearningSyncProvider } from '@/features/learning/offline/learning-sync-provider';
import { getSessionRepository } from '@/features/learning/offline/session-repository';
import { ANONYMOUS_QUERY_IDENTITY, clearPrivateQueryCache } from '@/lib/private-query';

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
      <LearningSyncProvider>{children}</LearningSyncProvider>
    </QueryClientProvider>
  );

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
    void (async () => {
      await clearPrivateQueryCache(queryClient, identityToClear);
      if (identityToClear !== ANONYMOUS_QUERY_IDENTITY) {
        await getSessionRepository().clearOwner(identityToClear);
      }
    })();
  }, [identity, queryClient]);

  return null;
}
