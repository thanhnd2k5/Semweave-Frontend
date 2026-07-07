'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { clientEnv } from '@/config/env.client';
import { OfflineProvider } from '@/features/_optional/offline/offline-provider';

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

  const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  if (clientEnv.featureOffline) {
    return <OfflineProvider>{content}</OfflineProvider>;
  }

  return content;
}
