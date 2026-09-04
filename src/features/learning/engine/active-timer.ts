import type { TimerSnapshot } from '../types';

export type { TimerSnapshot };

function sessionElapsed(timer: TimerSnapshot): number {
  return timer.sessionElapsedMs ?? 0;
}

export function idleTimer(): TimerSnapshot {
  return { elapsedMs: 0, runningSince: null, sessionElapsedMs: 0 };
}

export function startTimer(timer: TimerSnapshot, now: number): TimerSnapshot {
  if (timer.runningSince !== null) return { ...timer, sessionElapsedMs: sessionElapsed(timer) };
  return {
    elapsedMs: timer.elapsedMs,
    runningSince: now,
    sessionElapsedMs: sessionElapsed(timer),
  };
}

export function stopTimer(timer: TimerSnapshot, now: number): TimerSnapshot {
  return {
    elapsedMs: readElapsed(timer, now),
    runningSince: null,
    sessionElapsedMs: sessionElapsed(timer),
  };
}

export function readElapsed(timer: TimerSnapshot, now: number): number {
  if (timer.runningSince === null) return timer.elapsedMs;
  return timer.elapsedMs + Math.max(0, now - timer.runningSince);
}

export function resetTimer(now: number, sessionElapsedMs = 0): TimerSnapshot {
  return { elapsedMs: 0, runningSince: now, sessionElapsedMs };
}

export function addQuestionToSession(timer: TimerSnapshot): TimerSnapshot {
  return {
    ...timer,
    sessionElapsedMs: sessionElapsed(timer) + timer.elapsedMs,
  };
}

export function freezeTimer(timer: TimerSnapshot): TimerSnapshot {
  return {
    elapsedMs: timer.elapsedMs,
    runningSince: null,
    sessionElapsedMs: sessionElapsed(timer),
  };
}
