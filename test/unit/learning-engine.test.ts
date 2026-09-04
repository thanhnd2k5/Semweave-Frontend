import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DoubleAnswerError, reduceSession, initialMachineState } from '@/features/learning/engine/session-machine';
import { readElapsed, resetTimer, startTimer } from '@/features/learning/engine/active-timer';
import { createLearningDb, deleteLearningDb } from '@/features/learning/offline/local-db';
import { createSessionRepository } from '@/features/learning/offline/session-repository';
import {
  bootstrapSession,
  cacheCreatedSession,
  canAbandonSession,
  pauseForegroundTimer,
  queueSessionFinalization,
  resumeForegroundTimer,
  submitAnswer,
} from '@/features/learning/session-runtime';
import {
  processSyncOperation,
  resetSyncInflightForTests,
  scanAndProcessDueSync,
} from '@/features/learning/offline/sync-worker';
import { createSessionInputSchema, parseSessionBundle, sessionAttemptSchema } from '@/features/learning/schemas';
import { FILL_IN_ANSWER_MAX_LENGTH } from '@/features/learning/grading/fill-in-blank.grader';
import { gradeLocalAnswer } from '@/features/learning/engine/local-grade';
import type { SessionBundle } from '@/features/learning/types';

function bundle(): SessionBundle {
  return {
    id: 'session-1',
    clientSessionId: '11111111-1111-4111-8111-111111111111',
    type: 'WORD_TRIAL',
    status: 'IN_PROGRESS',
    startedAt: '2026-08-13T03:00:00.000Z',
    totalWords: 1,
    totalQuestions: 2,
    questions: [
      {
        id: 'q1',
        position: 0,
        word: { id: 'w1', term: 'ephemeral', depthLevel: 1 },
        type: 'DEFINITION_MATCH',
        question: 'Choose the matching word',
        contextLabel: null,
        options: [
          { id: 'option_a', text: 'lasting' },
          { id: 'option_b', text: 'ephemeral' },
          { id: 'option_c', text: 'heavy' },
          { id: 'option_d', text: 'ancient' },
        ],
        correctAnswer: 'ephemeral',
        acceptedVariants: [],
        explanation: 'short-lived',
        difficulty: 1,
        gradingVersion: 1,
      },
      {
        id: 'q2',
        position: 1,
        word: { id: 'w1', term: 'ephemeral', depthLevel: 1 },
        type: 'FILL_IN_BLANK',
        question: 'The joy was ______.',
        contextLabel: null,
        options: [],
        correctAnswer: 'ephemeral',
        acceptedVariants: ['fleeting'],
        explanation: 'blank',
        difficulty: 1,
        gradingVersion: 1,
      },
    ],
  };
}

describe('learning schemas', () => {
  it('requires wordId only for WORD_TRIAL', () => {
    expect(() =>
      createSessionInputSchema.parse({
        clientSessionId: '11111111-1111-4111-8111-111111111111',
        type: 'DUE_TODAY',
      }),
    ).not.toThrow();
    expect(
      createSessionInputSchema.safeParse({
        clientSessionId: '11111111-1111-4111-8111-111111111111',
        type: 'WORD_TRIAL',
      }).success,
    ).toBe(false);
  });

  it('normalizes NUANCE to NUANCE_COMPARISON and rejects unknown types', () => {
    const payload = {
      ...bundle(),
      questions: [
        {
          ...bundle().questions[0],
          type: 'NUANCE',
        },
      ],
    };
    expect(parseSessionBundle(payload).questions[0].type).toBe('NUANCE_COMPARISON');
    expect(
      parseSessionBundle({
        ...payload,
        questions: [{ ...payload.questions[0], type: 'NUANCE_COMPARISON' }],
      }).questions[0].type,
    ).toBe('NUANCE_COMPARISON');
    expect(() =>
      parseSessionBundle({
        ...payload,
        questions: [{ ...payload.questions[0], type: 'UNKNOWN_TYPE' }],
      }),
    ).toThrow();
  });

  it('rejects oversized fill-in answers', () => {
    expect(
      sessionAttemptSchema.safeParse({
        clientAttemptId: '11111111-1111-4111-8111-111111111111',
        sessionQuestionId: 'q1',
        sequence: 0,
        answer: { kind: 'TEXT', text: 'a'.repeat(FILL_IN_ANSWER_MAX_LENGTH + 1) },
        responseTimeMs: 1000,
        attemptedAt: '2026-08-13T03:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('local choice grading', () => {
  it('matches options after NFKC and case folding', () => {
    const question = bundle().questions[0];
    const result = gradeLocalAnswer(question, { kind: 'OPTION', optionId: 'option_b' });
    expect(result.isCorrect).toBe(true);
    const cased = gradeLocalAnswer(
      { ...question, correctAnswer: 'Ephemeral' },
      { kind: 'OPTION', optionId: 'option_b' },
    );
    expect(cased.isCorrect).toBe(true);
  });
});

describe('session machine', () => {
  it('blocks a second answer for the same question', () => {
    const questions = bundle().questions;
    const answered = reduceSession(
      initialMachineState(),
      { type: 'ANSWER', questionId: 'q1', isCorrect: true },
      questions,
    );
    expect(() =>
      reduceSession(answered, { type: 'ANSWER', questionId: 'q1', isCorrect: false }, questions),
    ).toThrow(DoubleAnswerError);
  });

  it('only abandons in-progress answering or feedback', () => {
    expect(
      canAbandonSession({ localStatus: 'IN_PROGRESS', phase: 'question', completing: false }),
    ).toBe(true);
    expect(
      canAbandonSession({ localStatus: 'IN_PROGRESS', phase: 'feedback', completing: false }),
    ).toBe(true);
    expect(
      canAbandonSession({ localStatus: 'IN_PROGRESS', phase: 'summary', completing: false }),
    ).toBe(false);
    expect(
      canAbandonSession({ localStatus: 'IN_PROGRESS', phase: 'question', completing: true }),
    ).toBe(false);
    expect(
      canAbandonSession({ localStatus: 'PENDING_COMPLETE', phase: 'summary', completing: false }),
    ).toBe(false);
  });
});

describe('learning IndexedDB v2', () => {
  const names: string[] = [];

  afterEach(async () => {
    resetSyncInflightForTests();
    await Promise.all(names.splice(0).map((name) => deleteLearningDb(name)));
  });

  async function repo() {
    const name = `semweave-test-${crypto.randomUUID()}`;
    names.push(name);
    const db = createLearningDb(name);
    await db.open();
    return { name, db, repo: createSessionRepository(db) };
  }

  it('drops unscoped v1 tables and isolates owners', async () => {
    const name = `semweave-migrate-${crypto.randomUUID()}`;
    names.push(name);
    const v1 = new Dexie(name);
    v1.version(1).stores({
      pendingAttempts: '++id, sessionId, syncedAt',
      cachedQuizPools: 'wordId, cachedAt',
    });
    await v1.open();
    await v1.table('pendingAttempts').add({ sessionId: 'legacy', payload: { x: 1 } });
    v1.close();

    const db = createLearningDb(name);
    await db.open();
    expect(db.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(['sessionSnapshots', 'sessionAttempts', 'sessionSyncOperations']),
    );
    expect(db.tables.map((table) => table.name)).not.toContain('pendingAttempts');
    expect(db.tables.map((table) => table.name)).not.toContain('cachedQuizPools');

    const store = createSessionRepository(db);
    const created = await cacheCreatedSession(store, 'user-a', bundle(), { now: () => 1_000 });
    expect(await store.loadSnapshot('user-b', created.snapshot.sessionId)).toBeUndefined();
    expect(await store.listAttempts('user-b', created.snapshot.sessionId)).toEqual([]);
  });

  it('commits attempt and cursor atomically and restores question, options, cursor and timer', async () => {
    const { repo: store } = await repo();
    let now = 10_000;
    const clock = { now: () => now, id: () => 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001' };
    const first = await cacheCreatedSession(store, 'user-a', bundle(), clock);
    expect(first.snapshot.bundle.questions[0].options.map((option) => option.id)).toEqual([
      'option_a',
      'option_b',
      'option_c',
      'option_d',
    ]);

    now = 12_500;
    const answered = await submitAnswer(
      store,
      first,
      { kind: 'OPTION', optionId: 'option_b' },
      clock,
    );
    expect(answered.machine.phase).toBe('feedback');
    expect(answered.attempts[0].responseTimeMs).toBe(2_500);
    expect(answered.timer.sessionElapsedMs).toBe(2_500);

    const snapshot = await store.loadSnapshot('user-a', 'session-1');
    const attempts = await store.listAttempts('user-a', 'session-1');
    expect(snapshot?.cursor).toBe(0);
    expect(attempts).toHaveLength(1);

    await expect(
      submitAnswer(store, answered, { kind: 'OPTION', optionId: 'option_a' }, clock),
    ).rejects.toBeInstanceOf(DoubleAnswerError);
    expect(await store.listAttempts('user-a', 'session-1')).toHaveLength(1);

    const resumed = await bootstrapSession(store, 'user-a', 'session-1', clock);
    expect(resumed.machine.phase).toBe('feedback');
    expect(resumed.machine.cursor).toBe(0);
    expect(resumed.snapshot.bundle.questions[0].options.map((option) => option.text)).toEqual(
      first.snapshot.bundle.questions[0].options.map((option) => option.text),
    );
    expect(resumed.attempts[0].localGrade.isCorrect).toBe(true);
  });

  it('does not count hidden or unloaded time toward the question timer', async () => {
    const { repo: store } = await repo();
    let now = 1_000;
    const clock = { now: () => now };
    let runtime = await cacheCreatedSession(store, 'user-a', bundle(), clock);
    now = 4_000;
    const resumed = await bootstrapSession(store, 'user-a', 'session-1', clock);
    expect(readElapsed(resumed.timer, now)).toBe(0);
    expect(readElapsed(startTimer(resetTimer(1_000), 1_000), 4_000)).toBe(3_000);

    now = 2_500;
    runtime = await pauseForegroundTimer(store, runtime, clock);
    expect(runtime.timer.runningSince).toBeNull();
    expect(runtime.timer.elapsedMs).toBe(1_500);
    now = 8_000;
    runtime = await resumeForegroundTimer(store, runtime, clock);
    expect(readElapsed(runtime.timer, 8_000)).toBe(1_500);
    expect(readElapsed(runtime.timer, 8_500)).toBe(2_000);
  });

  it('queues a single immutable finalization operation even if called twice', async () => {
    const { repo: store } = await repo();
    const clock = {
      now: () => 5_000,
      id: () => 'bbbbbbbb-cccc-4ddd-8eee-000000000002',
    };
    let runtime = await cacheCreatedSession(store, 'user-a', bundle(), clock);
    runtime = await submitAnswer(store, runtime, { kind: 'OPTION', optionId: 'option_b' }, clock);
    const first = await queueSessionFinalization(store, runtime, 'COMPLETE', clock);
    const second = await queueSessionFinalization(store, runtime, 'ABANDON', {
      now: () => 6_000,
      id: () => 'cccccccc-dddd-4eee-8fff-000000000003',
    });
    expect(second.syncId).toBe(first.syncId);
    expect(second.endpoint).toBe('COMPLETE');
    expect(second.payload).toEqual(first.payload);
    const due = await store.listDueSyncOperations(10_000);
    expect(due).toHaveLength(1);
    expect(await store.listDueSyncOperations(10_000, 'user-b')).toEqual([]);
    expect(await store.listDueSyncOperations(10_000, 'user-a')).toHaveLength(1);
  });

  it('retries reconnect finalization only one operation at a time', async () => {
    const { repo: store } = await repo();
    const clock = { now: () => 8_000, id: () => 'dddddddd-eeee-4fff-8888-000000000004' };
    let runtime = await cacheCreatedSession(store, 'user-a', bundle(), clock);
    runtime = await submitAnswer(store, runtime, { kind: 'OPTION', optionId: 'option_b' }, clock);
    await queueSessionFinalization(store, runtime, 'COMPLETE', clock);

    let release!: (value: { sessionId: string }) => void;
    const complete = vi.fn(
      () =>
        new Promise<{ sessionId: string }>((resolve) => {
          release = resolve;
        }),
    );

    const first = processSyncOperation('user-a', 'session-1', {
      repo: store,
      complete: complete as never,
      now: () => 8_000,
      jitter: () => 0,
    });
    const second = processSyncOperation('user-a', 'session-1', {
      repo: store,
      complete: complete as never,
      now: () => 8_000,
      jitter: () => 0,
    });

    await vi.waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    release({ sessionId: 'session-1' });
    await Promise.all([first, second]);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('retries reconnect finalization even when backoff has not elapsed', async () => {
    const { repo: store } = await repo();
    const clock = { now: () => 8_000, id: () => 'dddddddd-eeee-4fff-8888-000000000004' };
    let runtime = await cacheCreatedSession(store, 'user-a', bundle(), clock);
    runtime = await submitAnswer(store, runtime, { kind: 'OPTION', optionId: 'option_b' }, clock);
    await queueSessionFinalization(store, runtime, 'COMPLETE', clock);
    await store.markSyncResult({
      ownerId: 'user-a',
      sessionId: 'session-1',
      status: 'FAILED',
      lastError: 'network',
      retryCount: 1,
      nextRetryAt: 99_000,
      nowIso: '2026-09-04T12:00:00.000Z',
    });

    expect(await store.listDueSyncOperations(8_000, 'user-a')).toEqual([]);

    const complete = vi.fn(async () => ({ sessionId: 'session-1' }));
    const synced = await scanAndProcessDueSync({
      repo: store,
      ownerId: 'user-a',
      ignoreRetryAt: true,
      complete: complete as never,
      now: () => 8_000,
      jitter: () => 0,
    });

    expect(synced).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
