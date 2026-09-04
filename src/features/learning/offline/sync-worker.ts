import { ApiError } from '@/common/errors/api-error';
import { ErrorCodes } from '@/common/constants/error-codes';
import type { SessionSummary } from '../types';
import { abandonSession, completeSession } from '../api';
import type { SessionRepository } from './session-repository';
import { withSessionSyncLock } from './sync-lock';

export type SyncWorkerDeps = {
  repo: SessionRepository;
  complete?: typeof completeSession;
  abandon?: typeof abandonSession;
  now?: () => number;
  jitter?: () => number;
  isOnline?: () => boolean;
  ownerId?: string;
  /** Reconnect / tab focus should retry immediately instead of waiting on backoff. */
  ignoreRetryAt?: boolean;
};

const MAX_BACKOFF_MS = 30_000;

export function nextRetryAt(retryCount: number, now: number, jitter = Math.random): number {
  const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retryCount);
  return now + base + Math.floor(jitter() * 250);
}

const inflight = new Set<string>();

function inflightKey(ownerId: string, sessionId: string): string {
  return `${ownerId}:${sessionId}`;
}

export async function processSyncOperation(
  ownerId: string,
  sessionId: string,
  deps: SyncWorkerDeps,
): Promise<SessionSummary | null> {
  const key = inflightKey(ownerId, sessionId);
  if (inflight.has(key)) {
    return null;
  }
  inflight.add(key);

  try {
    return await withSessionSyncLock(deps.repo, ownerId, sessionId, async () => {
      const operation = await deps.repo.loadSyncOperation(ownerId, sessionId);
      if (!operation || operation.status === 'SYNCED' || operation.status === 'CONFLICT') {
        return null;
      }

      const claimed = await deps.repo.markSyncInFlight(operation);
      if (!claimed) return null;

      const complete = deps.complete ?? completeSession;
      const abandon = deps.abandon ?? abandonSession;
      const now = deps.now?.() ?? Date.now();
      const nowIso = new Date(now).toISOString();

      try {
        const summary =
          operation.endpoint === 'COMPLETE'
            ? await complete(sessionId, operation.payload)
            : await abandon(sessionId, operation.payload);

        await deps.repo.markSyncResult({
          ownerId,
          sessionId,
          status: 'SYNCED',
          lastError: null,
          localStatus: operation.endpoint === 'COMPLETE' ? 'SYNCED_COMPLETE' : 'SYNCED_ABANDON',
          canonicalSummary: summary,
          nowIso,
        });
        return summary;
      } catch (error) {
        const code = error instanceof ApiError ? error.code : null;
        if (code === ErrorCodes.SESSION_FINALIZATION_CONFLICT) {
          await deps.repo.markSyncResult({
            ownerId,
            sessionId,
            status: 'CONFLICT',
            lastError: code,
            nowIso,
          });
          return null;
        }

        const retryCount = operation.retryCount + 1;
        await deps.repo.markSyncResult({
          ownerId,
          sessionId,
          status: 'FAILED',
          lastError: code ?? (error instanceof Error ? error.message : 'SYNC_FAILED'),
          retryCount,
          nextRetryAt: nextRetryAt(retryCount, now, deps.jitter ?? Math.random),
          nowIso,
        });
        return null;
      }
    });
  } finally {
    inflight.delete(key);
  }
}

export async function scanAndProcessDueSync(deps: SyncWorkerDeps): Promise<boolean> {
  if (deps.isOnline && !deps.isOnline()) return false;
  const now = deps.now?.() ?? Date.now();
  const due =
    deps.ignoreRetryAt && deps.ownerId
      ? (await deps.repo.listOwnerSyncOperations(deps.ownerId)).filter(
          (operation) => operation.status === 'PENDING' || operation.status === 'FAILED',
        )
      : await deps.repo.listDueSyncOperations(now, deps.ownerId);
  let synced = false;
  for (const operation of due) {
    const summary = await processSyncOperation(operation.ownerId, operation.sessionId, deps);
    if (summary) synced = true;
  }
  return synced;
}

export function resetSyncInflightForTests(): void {
  inflight.clear();
}
