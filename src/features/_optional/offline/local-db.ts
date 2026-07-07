'use client';

import Dexie, { type Table } from 'dexie';

export interface PendingAttempt {
  id?: number;
  sessionId: string;
  syncedAt?: string;
  payload: Record<string, unknown>;
}

export interface CachedQuizPool {
  wordId: string;
  cachedAt: string;
  data: Record<string, unknown>;
}

class LocalDatabase extends Dexie {
  pendingAttempts!: Table<PendingAttempt, number>;
  cachedQuizPools!: Table<CachedQuizPool, string>;

  constructor() {
    super('NextjsStarterLocal');
    this.version(1).stores({
      pendingAttempts: '++id, sessionId, syncedAt',
      cachedQuizPools: 'wordId, cachedAt',
    });
  }
}

let db: LocalDatabase | null = null;

export function getLocalDb(): LocalDatabase {
  if (!db) {
    db = new LocalDatabase();
  }
  return db;
}
