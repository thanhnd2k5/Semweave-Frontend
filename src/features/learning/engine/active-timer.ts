export type TimerSnapshot = {
  elapsedMs: number;
  runningSince: number | null;
};

export function idleTimer(): TimerSnapshot {
  return { elapsedMs: 0, runningSince: null };
}

export function startTimer(timer: TimerSnapshot, now: number): TimerSnapshot {
  if (timer.runningSince !== null) return timer;
  return { elapsedMs: timer.elapsedMs, runningSince: now };
}

export function stopTimer(timer: TimerSnapshot, now: number): TimerSnapshot {
  return { elapsedMs: readElapsed(timer, now), runningSince: null };
}

export function readElapsed(timer: TimerSnapshot, now: number): number {
  if (timer.runningSince === null) return timer.elapsedMs;
  return timer.elapsedMs + Math.max(0, now - timer.runningSince);
}

export function resetTimer(now: number): TimerSnapshot {
  return { elapsedMs: 0, runningSince: now };
}
