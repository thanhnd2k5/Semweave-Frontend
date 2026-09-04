import Dexie, { type Table } from 'dexie';
import type {
  SessionSnapshotRecord,
  SessionSyncOperation,
  StoredSessionAttempt,
} from '../types';

export class LearningDatabase extends Dexie {
  sessionSnapshots!: Table<SessionSnapshotRecord, [string, string]>;
  sessionAttempts!: Table<StoredSessionAttempt, [string, string, string]>;
  sessionSyncOperations!: Table<SessionSyncOperation, [string, string]>;

  constructor(name = 'SemweaveLocal') {
    super(name);
    this.version(1).stores({
      pendingAttempts: '++id, sessionId, syncedAt',
      cachedQuizPools: 'wordId, cachedAt',
    });
    this.version(2).stores({
      pendingAttempts: null,
      cachedQuizPools: null,
      sessionSnapshots: '[ownerId+sessionId], ownerId, updatedAt',
      sessionAttempts:
        '[ownerId+sessionId+sessionQuestionId], ownerId, &[ownerId+clientAttemptId], sessionId',
      sessionSyncOperations: '[ownerId+sessionId], ownerId, status, nextRetryAt',
    });
  }
}

const databases = new Map<string, LearningDatabase>();

export function createLearningDb(name = 'SemweaveLocal'): LearningDatabase {
  const existing = databases.get(name);
  if (existing) return existing;
  const db = new LearningDatabase(name);
  databases.set(name, db);
  return db;
}

export function getLearningDb(): LearningDatabase {
  return createLearningDb();
}

export async function deleteLearningDb(name = 'SemweaveLocal'): Promise<void> {
  const existing = databases.get(name);
  if (existing) {
    existing.close();
    databases.delete(name);
  }
  await Dexie.delete(name);
}
