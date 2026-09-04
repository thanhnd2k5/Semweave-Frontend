import { newId } from './ids';
import { hashFinalizationPayload } from './engine/payload-hash';
import { gradeLocalAnswer } from './engine/local-grade';
import {
  DoubleAnswerError,
  initialMachineState,
  reduceSession,
  type SessionMachineState,
  type SessionPhase,
} from './engine/session-machine';
import {
  addQuestionToSession,
  freezeTimer,
  idleTimer,
  resetTimer,
  startTimer,
  stopTimer,
} from './engine/active-timer';
import { createSession, getSession } from './api';
import type { SessionRepository } from './offline/session-repository';
import type {
  CreateSessionInput,
  FinalizeSessionInput,
  FinalizationEndpoint,
  SessionAttemptAnswer,
  SessionBundle,
  SessionSnapshotRecord,
  StoredSessionAttempt,
  TimerSnapshot,
  LocalSessionStatus,
} from './types';

export type Clock = {
  now: () => number;
  id?: () => string;
};

export type SessionRuntime = {
  snapshot: SessionSnapshotRecord;
  attempts: StoredSessionAttempt[];
  machine: SessionMachineState;
  timer: TimerSnapshot;
};

function toIso(now: number): string {
  return new Date(now).toISOString();
}

function restoreRuntime(
  snapshot: SessionSnapshotRecord,
  attempts: StoredSessionAttempt[],
  now: number,
): SessionRuntime {
  const answeredQuestionIds = attempts.map((attempt) => attempt.sessionQuestionId);
  const current = snapshot.bundle.questions[snapshot.cursor];
  const currentAttempt = current
    ? attempts.find((attempt) => attempt.sessionQuestionId === current.id)
    : undefined;

  let machine: SessionMachineState;
  if (
    snapshot.localStatus !== 'IN_PROGRESS' ||
    answeredQuestionIds.length >= snapshot.bundle.questions.length
  ) {
    machine = {
      phase: 'summary',
      cursor: snapshot.cursor,
      answeredQuestionIds,
      currentFeedback: null,
      draft: '',
    };
  } else if (currentAttempt && current) {
    machine = reduceSession(
      { ...initialMachineState(), cursor: snapshot.cursor, answeredQuestionIds },
      {
        type: 'RESTORE',
        cursor: snapshot.cursor,
        answeredQuestionIds,
        lastFeedbackCorrect: currentAttempt.localGrade.isCorrect,
      },
      snapshot.bundle.questions,
    );
  } else {
    machine = reduceSession(
      initialMachineState(),
      { type: 'RESTORE', cursor: snapshot.cursor, answeredQuestionIds },
      snapshot.bundle.questions,
    );
  }

  const frozen = freezeTimer(snapshot.timer);
  const timer =
    machine.phase === 'question' && snapshot.localStatus === 'IN_PROGRESS'
      ? startTimer(frozen, now)
      : frozen;

  return { snapshot: { ...snapshot, timer }, attempts, machine, timer };
}

export function canAbandonSession(input: {
  localStatus: LocalSessionStatus;
  phase: SessionPhase;
  completing: boolean;
}): boolean {
  if (input.completing) return false;
  if (input.phase === 'summary') return false;
  return input.localStatus === 'IN_PROGRESS';
}

export async function cacheCreatedSession(
  repo: SessionRepository,
  ownerId: string,
  bundle: SessionBundle,
  clock: Clock = { now: Date.now },
): Promise<SessionRuntime> {
  const now = clock.now();
  const snapshot = await repo.cacheBundle({
    ownerId,
    bundle,
    nowIso: toIso(now),
    timer: resetTimer(now),
  });
  return restoreRuntime(snapshot, [], now);
}

export async function createAndCacheSession(
  repo: SessionRepository,
  ownerId: string,
  input: Omit<CreateSessionInput, 'clientSessionId'> & { clientSessionId?: string },
  clock: Clock = { now: Date.now },
): Promise<SessionRuntime> {
  const clientSessionId = input.clientSessionId ?? clock.id?.() ?? newId();
  const bundle = await createSession({ ...input, clientSessionId });
  return cacheCreatedSession(repo, ownerId, bundle, clock);
}

export async function bootstrapSession(
  repo: SessionRepository,
  ownerId: string,
  sessionId: string,
  clock: Clock = { now: Date.now },
): Promise<SessionRuntime> {
  const now = clock.now();
  const existing = await repo.loadSnapshot(ownerId, sessionId);
  if (existing) {
    const attempts = await repo.listAttempts(ownerId, sessionId);
    const runtime = restoreRuntime(existing, attempts, now);
    if (runtime.timer.runningSince !== existing.timer.runningSince) {
      await repo.updateCursorAndTimer({
        ownerId,
        sessionId,
        cursor: runtime.snapshot.cursor,
        timer: runtime.timer,
        nowIso: toIso(now),
      });
    }
    return runtime;
  }

  const remote = await getSession(sessionId);
  if (!('questions' in remote)) {
    throw new Error('Session is already finalized');
  }
  return cacheCreatedSession(repo, ownerId, remote, clock);
}

export async function submitAnswer(
  repo: SessionRepository,
  runtime: SessionRuntime,
  answer: SessionAttemptAnswer,
  clock: Clock = { now: Date.now },
): Promise<SessionRuntime> {
  const question = runtime.snapshot.bundle.questions[runtime.machine.cursor];
  if (!question) {
    throw new Error('No current question');
  }
  if (runtime.machine.phase !== 'question') {
    throw new DoubleAnswerError(question.id);
  }

  const existing = await repo.getAttempt(
    runtime.snapshot.ownerId,
    runtime.snapshot.sessionId,
    question.id,
  );
  if (existing) {
    throw new DoubleAnswerError(question.id);
  }

  const now = clock.now();
  const stopped = addQuestionToSession(stopTimer(runtime.timer, now));
  const localGrade = gradeLocalAnswer(question, answer);
  const attempt = {
    clientAttemptId: clock.id?.() ?? newId(),
    sessionQuestionId: question.id,
    sequence: runtime.attempts.length,
    answer,
    responseTimeMs: Math.min(1_800_000, stopped.elapsedMs),
    attemptedAt: toIso(now),
  };

  const stored = await repo.commitAttemptAndCursor({
    ownerId: runtime.snapshot.ownerId,
    sessionId: runtime.snapshot.sessionId,
    attempt,
    localGrade,
    cursor: runtime.machine.cursor,
    timer: stopped,
    nowIso: toIso(now),
  });

  const machine = reduceSession(
    runtime.machine,
    { type: 'ANSWER', questionId: question.id, isCorrect: localGrade.isCorrect },
    runtime.snapshot.bundle.questions,
  );

  return {
    snapshot: { ...runtime.snapshot, timer: stopped, updatedAt: toIso(now) },
    attempts: [...runtime.attempts, stored],
    machine,
    timer: stopped,
  };
}

export async function advanceQuestion(
  repo: SessionRepository,
  runtime: SessionRuntime,
  clock: Clock = { now: Date.now },
): Promise<SessionRuntime> {
  const now = clock.now();
  const machine = reduceSession(
    runtime.machine,
    { type: 'NEXT', totalQuestions: runtime.snapshot.bundle.questions.length },
    runtime.snapshot.bundle.questions,
  );
  const timer =
    machine.phase === 'question'
      ? resetTimer(now, runtime.timer.sessionElapsedMs ?? 0)
      : stopTimer(runtime.timer, now);
  await repo.updateCursorAndTimer({
    ownerId: runtime.snapshot.ownerId,
    sessionId: runtime.snapshot.sessionId,
    cursor: machine.cursor,
    timer,
    nowIso: toIso(now),
  });
  return {
    snapshot: { ...runtime.snapshot, cursor: machine.cursor, timer, updatedAt: toIso(now) },
    attempts: runtime.attempts,
    machine,
    timer,
  };
}

export async function queueSessionFinalization(
  repo: SessionRepository,
  runtime: SessionRuntime,
  endpoint: FinalizationEndpoint,
  clock: Clock = { now: Date.now },
) {
  const now = clock.now();
  const payload: FinalizeSessionInput = {
    syncId: clock.id?.() ?? newId(),
    finalizedAt: toIso(now),
    attempts: runtime.attempts.map((attempt) => ({
      clientAttemptId: attempt.clientAttemptId,
      sessionQuestionId: attempt.sessionQuestionId,
      sequence: attempt.sequence,
      answer: attempt.answer,
      responseTimeMs: attempt.responseTimeMs,
      attemptedAt: attempt.attemptedAt,
    })),
  };
  return repo.queueFinalization({
    ownerId: runtime.snapshot.ownerId,
    sessionId: runtime.snapshot.sessionId,
    syncId: payload.syncId,
    endpoint,
    payload,
    payloadHash: hashFinalizationPayload(endpoint, payload),
    now,
    nowIso: toIso(now),
  });
}

export async function pauseForegroundTimer(
  repo: SessionRepository,
  runtime: SessionRuntime,
  clock: Clock = { now: Date.now },
): Promise<SessionRuntime> {
  if (runtime.machine.phase !== 'question' || runtime.timer.runningSince === null) {
    return runtime;
  }
  const now = clock.now();
  const timer = stopTimer(runtime.timer, now);
  await repo.updateCursorAndTimer({
    ownerId: runtime.snapshot.ownerId,
    sessionId: runtime.snapshot.sessionId,
    cursor: runtime.machine.cursor,
    timer,
    nowIso: toIso(now),
  });
  return {
    ...runtime,
    snapshot: { ...runtime.snapshot, timer, updatedAt: toIso(now) },
    timer,
  };
}

export async function resumeForegroundTimer(
  repo: SessionRepository,
  runtime: SessionRuntime,
  clock: Clock = { now: Date.now },
): Promise<SessionRuntime> {
  if (runtime.machine.phase !== 'question' || runtime.snapshot.localStatus !== 'IN_PROGRESS') {
    return runtime;
  }
  if (runtime.timer.runningSince !== null) return runtime;
  const now = clock.now();
  const timer = startTimer(freezeTimer(runtime.timer), now);
  await repo.updateCursorAndTimer({
    ownerId: runtime.snapshot.ownerId,
    sessionId: runtime.snapshot.sessionId,
    cursor: runtime.machine.cursor,
    timer,
    nowIso: toIso(now),
  });
  return {
    ...runtime,
    snapshot: { ...runtime.snapshot, timer, updatedAt: toIso(now) },
    timer,
  };
}

export { idleTimer };
