'use client';

import { useEffect, useState } from 'react';
import { ANONYMOUS_QUERY_IDENTITY } from '@/lib/private-query';
import { getSessionRepository } from './session-repository';

export function usePendingSyncCount(ownerId: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (ownerId === ANONYMOUS_QUERY_IDENTITY) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      const operations = await getSessionRepository().listOwnerSyncOperations(ownerId);
      const pending = operations.filter(
        (operation) =>
          operation.status === 'PENDING' ||
          operation.status === 'FAILED' ||
          operation.status === 'IN_FLIGHT',
      ).length;
      if (!cancelled) setCount(pending);
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    window.addEventListener('online', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
    };
  }, [ownerId]);

  return ownerId === ANONYMOUS_QUERY_IDENTITY ? 0 : count;
}
