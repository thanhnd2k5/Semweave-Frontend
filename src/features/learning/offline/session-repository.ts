import type { LearningDatabase } from './local-db';
import type {
  FinalizeSessionInput,
  FinalizationEndpoint,
  LocalGrade,
  SessionAttempt,
  SessionBundle,
  SessionSnapshotRecord,
  SessionSummary,
  SessionSyncOperation,
  StoredSessionAttempt,
  TimerSnapshot,
} from '../types';
import { getLearningDb } from './local-db';

export class SessionAlreadyQueuedError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} already has a finalization operation`);
    this.name = 'SessionAlreadyQueuedError';
  }
}

export function createSessionRepository(db: LearningDatabase) {
  return {
    async saveSnapshot(record: SessionSnapshotRecord): Promise<void> {
      await db.sessionSnapshots.put(record);
    },

    async loadSnapshot(ownerId: string, sessionId: string): Promise<SessionSnapshotRecord | undefined> {
      return db.sessionSnapshots.get([ownerId, sessionId]);
    },

    async listAttempts(ownerId: string, sessionId: string): Promise<StoredSessionAttempt[]> {
      const rows = await db.sessionAttempts.where('ownerId').equals(ownerId).toArray();
      return rows
        .filter((row) => row.sessionId === sessionId)
        .sort((a, b) => a.sequence - b.sequence);
    },

    async getAttempt(
      ownerId: string,
      sessionId: string,
      sessionQuestionId: string,
    ): Promise<StoredSessionAttempt | undefined> {
      return db.sessionAttempts.get([ownerId, sessionId, sessionQuestionId]);
    },

    async commitAttemptAndCursor(input: {
      ownerId: string;
      sessionId: string;
      attempt: SessionAttempt;
      localGrade: LocalGrade;
      cursor: number;
      timer: TimerSnapshot;
      nowIso: string;
    }): Promise<StoredSessionAttempt> {
      const stored: StoredSessionAttempt = {
        ...input.attempt,
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        localGrade: input.localGrade,
      };

      await db.transaction('rw', db.sessionSnapshots, db.sessionAttempts, async () => {
        const snapshot = await db.sessionSnapshots.get([input.ownerId, input.sessionId]);
        if (!snapshot) {
          throw new Error(`Missing snapshot ${input.sessionId}`);
        }
        const existing = await db.sessionAttempts.get([
          input.ownerId,
          input.sessionId,
          input.attempt.sessionQuestionId,
        ]);
        if (existing) {
          throw new Error(`Attempt already exists for ${input.attempt.sessionQuestionId}`);
        }
        await db.sessionAttempts.put(stored);
        await db.sessionSnapshots.put({
          ...snapshot,
          cursor: input.cursor,
          timer: input.timer,
          updatedAt: input.nowIso,
        });
      });

      return stored;
    },

    async updateCursorAndTimer(input: {
      ownerId: string;
      sessionId: string;
      cursor: number;
      timer: TimerSnapshot;
      nowIso: string;
    }): Promise<void> {
      const snapshot = await db.sessionSnapshots.get([input.ownerId, input.sessionId]);
      if (!snapshot) return;
      await db.sessionSnapshots.put({
        ...snapshot,
        cursor: input.cursor,
        timer: input.timer,
        updatedAt: input.nowIso,
      });
    },

    async cacheBundle(input: {
      ownerId: string;
      bundle: SessionBundle;
      nowIso: string;
      timer: TimerSnapshot;
    }): Promise<SessionSnapshotRecord> {
      const existing = await db.sessionSnapshots.get([input.ownerId, input.bundle.id]);
      if (existing) return existing;
      const record: SessionSnapshotRecord = {
        ownerId: input.ownerId,
        sessionId: input.bundle.id,
        bundle: input.bundle,
        cursor: 0,
        localStatus: 'IN_PROGRESS',
        timer: input.timer,
        createdAt: input.nowIso,
        updatedAt: input.nowIso,
      };
      await db.sessionSnapshots.put(record);
      return record;
    },

    async queueFinalization(input: {
      ownerId: string;
      sessionId: string;
      syncId: string;
      endpoint: FinalizationEndpoint;
      payload: FinalizeSessionInput;
      payloadHash: string;
      now: number;
      nowIso: string;
    }): Promise<SessionSyncOperation> {
      return db.transaction('rw', db.sessionSnapshots, db.sessionSyncOperations, async () => {
        const existing = await db.sessionSyncOperations.get([input.ownerId, input.sessionId]);
        if (existing) {
          return existing;
        }
        const snapshot = await db.sessionSnapshots.get([input.ownerId, input.sessionId]);
        if (!snapshot) {
          throw new Error(`Missing snapshot ${input.sessionId}`);
        }
        const operation: SessionSyncOperation = {
          ownerId: input.ownerId,
          sessionId: input.sessionId,
          syncId: input.syncId,
          endpoint: input.endpoint,
          payload: input.payload,
          payloadHash: input.payloadHash,
          retryCount: 0,
          nextRetryAt: input.now,
          lastError: null,
          status: 'PENDING',
          leaseOwner: null,
          leaseExpiresAt: null,
        };
        await db.sessionSyncOperations.put(operation);
        await db.sessionSnapshots.put({
          ...snapshot,
          localStatus: input.endpoint === 'COMPLETE' ? 'PENDING_COMPLETE' : 'PENDING_ABANDON',
          timer: { elapsedMs: snapshot.timer.elapsedMs, runningSince: null },
          updatedAt: input.nowIso,
        });
        return operation;
      });
    },

    async loadSyncOperation(
      ownerId: string,
      sessionId: string,
    ): Promise<SessionSyncOperation | undefined> {
      return db.sessionSyncOperations.get([ownerId, sessionId]);
    },

    async listDueSyncOperations(now: number): Promise<SessionSyncOperation[]> {
      return db.sessionSyncOperations
        .filter(
          (operation) =>
            (operation.status === 'PENDING' || operation.status === 'FAILED') &&
            operation.nextRetryAt <= now,
        )
        .toArray();
    },

    async listOwnerSyncOperations(ownerId: string): Promise<SessionSyncOperation[]> {
      return db.sessionSyncOperations.where('ownerId').equals(ownerId).toArray();
    },

    async markSyncInFlight(operation: SessionSyncOperation): Promise<boolean> {
      const current = await db.sessionSyncOperations.get([operation.ownerId, operation.sessionId]);
      if (!current || current.status === 'SYNCED' || current.status === 'CONFLICT') {
        return false;
      }
      if (current.status === 'IN_FLIGHT') {
        return false;
      }
      await db.sessionSyncOperations.put({ ...current, status: 'IN_FLIGHT', lastError: null });
      return true;
    },

    async markSyncResult(input: {
      ownerId: string;
      sessionId: string;
      status: SessionSyncOperation['status'];
      lastError?: string | null;
      retryCount?: number;
      nextRetryAt?: number;
      localStatus?: SessionSnapshotRecord['localStatus'];
      canonicalSummary?: SessionSummary | null;
      nowIso: string;
    }): Promise<void> {
      await db.transaction('rw', db.sessionSnapshots, db.sessionSyncOperations, async () => {
        const operation = await db.sessionSyncOperations.get([input.ownerId, input.sessionId]);
        if (operation) {
          await db.sessionSyncOperations.put({
            ...operation,
            status: input.status,
            lastError: input.lastError ?? operation.lastError,
            retryCount: input.retryCount ?? operation.retryCount,
            nextRetryAt: input.nextRetryAt ?? operation.nextRetryAt,
          });
        }
        const snapshot = await db.sessionSnapshots.get([input.ownerId, input.sessionId]);
        if (snapshot && (input.localStatus || input.canonicalSummary !== undefined)) {
          await db.sessionSnapshots.put({
            ...snapshot,
            localStatus: input.localStatus ?? snapshot.localStatus,
            canonicalSummary:
              input.canonicalSummary !== undefined
                ? input.canonicalSummary
                : snapshot.canonicalSummary,
            updatedAt: input.nowIso,
          });
        }
      });
    },

    async saveLease(operation: SessionSyncOperation): Promise<void> {
      await db.sessionSyncOperations.put(operation);
    },

    async clearOwner(ownerId: string): Promise<void> {
      await db.transaction(
        'rw',
        db.sessionSnapshots,
        db.sessionAttempts,
        db.sessionSyncOperations,
        async () => {
          await db.sessionSnapshots.where('ownerId').equals(ownerId).delete();
          await db.sessionAttempts.where('ownerId').equals(ownerId).delete();
          await db.sessionSyncOperations.where('ownerId').equals(ownerId).delete();
        },
      );
    },
  };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;

let singleton: SessionRepository | null = null;

export function getSessionRepository(): SessionRepository {
  if (!singleton) {
    singleton = createSessionRepository(getLearningDb());
  }
  return singleton;
}

export function setSessionRepositoryForTests(repo: SessionRepository | null): void {
  singleton = repo;
}
