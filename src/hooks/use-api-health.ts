'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AppInfo } from '@/common/types/api.types';
import { clientEnv } from '@/config/env.client';

export function useApiHealth() {
  return useQuery({
    queryKey: ['api', 'health'],
    queryFn: () => api.get<AppInfo>('/'),
    enabled: !!clientEnv.apiUrl || clientEnv.featureApiProxy,
    retry: false,
    staleTime: 30_000,
  });
}
