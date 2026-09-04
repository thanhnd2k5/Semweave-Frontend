import type { QueryClient } from '@tanstack/react-query';
import { privateQueryKeys } from '@/lib/private-query';

export const learningQueryKeys = {
  stats: (identity: string) => privateQueryKeys.sessionStats(identity),
  dueToday: (identity: string) => privateQueryKeys.dueToday(identity),
  sessions: (identity: string) => privateQueryKeys.sessions(identity),
  session: (identity: string, sessionId: string) => privateQueryKeys.session(identity, sessionId),
};

export function invalidateLearningStats(queryClient: QueryClient, identity: string) {
  return queryClient.invalidateQueries({ queryKey: privateQueryKeys.sessions(identity) });
}
