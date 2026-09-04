import type { SessionRepository } from './session-repository';
import type { SessionSyncOperation } from '../types';

const LOCK_PREFIX = 'semweave-sync';
const LEASE_MS = 15_000;

export type LockClock = {
  now: () => number;
  randomId?: () => string;
};

function lockName(ownerId: string, sessionId: string): string {
  return `${LOCK_PREFIX}:${ownerId}:${sessionId}`;
}

async function withWebLock<T>(
  ownerId: string,
  sessionId: string,
  task: () => Promise<T>,
): Promise<T> {
  const locks = globalThis.navigator?.locks;
  if (typeof locks?.request !== 'function') {
    throw new Error('Web Locks unavailable');
  }
  return locks.request(lockName(ownerId, sessionId), { mode: 'exclusive' }, task);
}

async function withDexieLease<T>(
  repo: SessionRepository,
  ownerId: string,
  sessionId: string,
  task: () => Promise<T>,
  clock: LockClock,
): Promise<T | null> {
  const now = clock.now();
  const leaseOwner = clock.randomId?.() ?? `lease-${now}`;
  const operation = await repo.loadSyncOperation(ownerId, sessionId);
  if (!operation) {
    return task();
  }
  if (
    operation.leaseOwner &&
    operation.leaseExpiresAt &&
    operation.leaseExpiresAt > now &&
    operation.leaseOwner !== leaseOwner
  ) {
    return null;
  }

  const leased: SessionSyncOperation = {
    ...operation,
    leaseOwner,
    leaseExpiresAt: now + LEASE_MS,
  };
  await repo.saveLease(leased);
  try {
    return await task();
  } finally {
    const latest = await repo.loadSyncOperation(ownerId, sessionId);
    if (latest && latest.leaseOwner === leaseOwner) {
      await repo.saveLease({ ...latest, leaseOwner: null, leaseExpiresAt: null });
    }
  }
}

export async function withSessionSyncLock<T>(
  repo: SessionRepository,
  ownerId: string,
  sessionId: string,
  task: () => Promise<T>,
  clock: LockClock = { now: () => Date.now() },
): Promise<T | null> {
  if (typeof globalThis.navigator?.locks?.request === 'function') {
    return withWebLock(ownerId, sessionId, task);
  }
  return withDexieLease(repo, ownerId, sessionId, task, clock);
}
