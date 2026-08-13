'use client';

import { getQueryIdentity } from '@/lib/private-query';
import { useAuthStore } from '@/stores/auth-store';

export function useQueryIdentity(): string {
  return useAuthStore((state) => getQueryIdentity(state.user?.id));
}
