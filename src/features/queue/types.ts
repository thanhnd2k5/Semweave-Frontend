import type { PaginationMeta, WordDetail } from '@/features/words/types';

export interface QueueItem {
  id: string;
  priority: number;
  addedAt: string;
  word: Pick<WordDetail, 'id' | 'term' | 'status' | 'content' | 'tags' | 'health'>;
}

export interface QueueListResult {
  items: QueueItem[];
  meta: PaginationMeta;
  summary: {
    count: number;
    warningThreshold: number;
    maxSize: number;
  };
}

export interface QueueProcessResult {
  accepted: Array<{ wordId: string; term: string; status: 'PENDING' | 'FAILED' }>;
  remainingQueue: number;
  dailyRemaining: number;
}
