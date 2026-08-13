import { api } from '@/lib/api-client';
import type { QueueItem, QueueListResult, QueueProcessResult } from './types';

export function listQueue(page = 1, pageSize = 20): Promise<QueueListResult> {
  return api.get<QueueListResult>('/queue', { params: { page, pageSize } });
}

export function addQueueItem(wordId: string): Promise<{ added: boolean; item: QueueItem }> {
  return api.post<{ added: boolean; item: QueueItem }>('/queue', { wordId });
}

export function removeQueueItem(wordId: string): Promise<{ deleted: true }> {
  return api.delete<{ deleted: true }>(`/queue/${wordId}`);
}

export function processQueue(count: number): Promise<QueueProcessResult> {
  return api.post<QueueProcessResult>('/queue/process', { count });
}
