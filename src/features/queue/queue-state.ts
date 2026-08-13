import type { QueueItem, QueueListResult } from './types';

export interface QueuePollTarget {
  count: number;
  expiresAt: number;
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
