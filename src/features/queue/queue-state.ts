import type { QueueItem, QueueListResult } from './types';

export const QUEUE_PROCESS_COUNTS = [1, 2, 3, 5] as const;

export interface QueuePollTarget {
  count: number;
  expiresAt: number;
}

export function getDefaultQueueProcessCount(dailyNewWordLimit: number): number {
  if (!Number.isFinite(dailyNewWordLimit)) return 3;

  // The API requires at least one item; count=1 also lets a zero-limit user retry
  // a FAILED word, which does not consume a new-word slot.
  const upperBound = Math.max(1, Math.floor(dailyNewWordLimit));
  return [...QUEUE_PROCESS_COUNTS]
    .reverse()
    .find((count) => count <= upperBound) ?? 1;
}

export function shouldPollQueue(
  items: QueueItem[] | undefined,
): boolean {
  return Boolean(items?.some((item) => item.word.status === 'PENDING'));
}

export function shouldPollForQueueCount(
  target: QueuePollTarget | null,
  currentCount: number | undefined,
  now: number,
): boolean {
  if (!target || now >= target.expiresAt) return false;
  return currentCount === undefined || currentCount > target.count;
}

export function markQueueWordsPending(
  result: QueueListResult | undefined,
  wordIds: ReadonlySet<string>,
): QueueListResult | undefined {
  if (!result || wordIds.size === 0) return result;

  return {
    ...result,
    items: result.items.map((item) =>
      wordIds.has(item.word.id)
        ? { ...item, word: { ...item.word, status: 'PENDING' } }
        : item,
    ),
  };
}
