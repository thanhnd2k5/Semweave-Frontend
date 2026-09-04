'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { ANONYMOUS_QUERY_IDENTITY } from '@/lib/private-query';
import { invalidateLearningStats } from '../learning-query-keys';
import { getSessionRepository } from './session-repository';
import { scanAndProcessDueSync } from './sync-worker';

interface LearningSyncProviderProps {
  children: ReactNode;
}

export function LearningSyncProvider({ children }: LearningSyncProviderProps) {
  const identity = useQueryIdentity();
  const queryClient = useQueryClient();
  const previousIdentity = useRef(identity);

  const runScan = useCallback(() => {
    if (identity === ANONYMOUS_QUERY_IDENTITY) return;
    void scanAndProcessDueSync({
      repo: getSessionRepository(),
      ownerId: identity,
      ignoreRetryAt: true,
      isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    }).then((synced) => {
      if (synced) {
        void invalidateLearningStats(queryClient, identity);
      }
    });
  }, [identity, queryClient]);

  useEffect(() => {
    if (previousIdentity.current === identity) {
      runScan();
      return;
    }

    previousIdentity.current = identity;
    runScan();
  }, [identity, runScan]);

  useEffect(() => {
    const onOnline = () => runScan();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runScan]);

  return <>{children}</>;
}
