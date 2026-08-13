import { describe, expect, it } from 'vitest';
import {
  markQueueWordsPending,
  shouldPollForQueueCount,
  shouldPollQueue,
} from '@/features/queue/queue-state';
import type { QueueItem, QueueListResult } from '@/features/queue/types';
import { getCanonicalPage } from '@/lib/pagination';

function queueItem(status: QueueItem['word']['status']): QueueItem {
  return {
    id: 'queue-1',
    priority: 0,
    addedAt: '2026-01-01T00:00:00.000Z',
    word: {
      id: 'word-1',
      term: 'fleeting',
      status,
      content: null,
      tags: [],
      health: null,
    },
  };
}

describe('queue polling state', () => {
  it('polls for pending server items and newly accepted items', () => {
    expect(shouldPollQueue([queueItem('PENDING')])).toBe(true);
    expect(shouldPollQueue([queueItem('SHADOW')])).toBe(false);
    expect(shouldPollQueue([queueItem('FAILED')])).toBe(false);
    expect(shouldPollQueue([])).toBe(false);
  });

  it('keeps polling a global queue target when accepted words are on another page', () => {
    const target = { count: 8, expiresAt: 40_000 };
    expect(shouldPollForQueueCount(target, 10, 20_000)).toBe(true);
    expect(shouldPollForQueueCount(target, 8, 20_000)).toBe(false);
    expect(shouldPollForQueueCount(target, 10, 40_000)).toBe(false);
  });

  it('marks accepted cached items pending before the first refetch', () => {
    const result: QueueListResult = {
      items: [queueItem('SHADOW')],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      summary: { count: 1, warningThreshold: 50, maxSize: 100 },
    };

    expect(markQueueWordsPending(result, new Set(['word-1']))?.items[0].word.status).toBe(
      'PENDING',
    );
  });
});

describe('pagination correction', () => {
  it('moves an empty last page to the nearest valid page', () => {
    expect(getCanonicalPage(3, 2)).toBe(2);
    expect(getCanonicalPage(2, 0)).toBe(1);
    expect(getCanonicalPage(2, 2)).toBeNull();
  });
});
