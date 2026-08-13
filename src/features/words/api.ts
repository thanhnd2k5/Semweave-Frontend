import { api } from '@/lib/api-client';
import type {
  AmbiguityResult,
  CreateWordResult,
  DuplicateCheckResult,
  WordDetail,
  WordListParams,
  WordListResult,
  ImportBatchStatus,
  ImportWordsResult,
} from './types';

export function checkDuplicate(term: string): Promise<DuplicateCheckResult> {
  return api.get<DuplicateCheckResult>('/words/check-duplicate', { params: { term } });
}

export function detectAmbiguity(term: string): Promise<AmbiguityResult> {
  return api.post<AmbiguityResult>('/words/detect-ambiguity', { term });
}

export function createWord(term: string, context?: string): Promise<CreateWordResult> {
  return api.post<CreateWordResult>('/words', {
    term,
    ...(context ? { context } : {}),
  });
}

export function getWord(wordId: string): Promise<WordDetail> {
  return api.get<WordDetail>(`/words/${wordId}`);
}

export function listWords(params: WordListParams): Promise<WordListResult> {
  return api.get<WordListResult>('/words', {
    params: {
      ...params,
      statuses: params.statuses?.join(','),
    },
  });
}

export function updateWordTags(wordId: string, tags: string[]): Promise<WordDetail> {
  return api.patch<WordDetail>(`/words/${wordId}`, { tags });
}

export function deleteWord(wordId: string): Promise<{ deleted: true }> {
  return api.delete<{ deleted: true }>(`/words/${wordId}`);
}

export function importWords(terms: string[], tags?: string[]): Promise<ImportWordsResult> {
  return api.post<ImportWordsResult>('/words/import', {
    terms,
    ...(tags?.length ? { tags } : {}),
  });
}

export function getImportBatch(batchId: string): Promise<ImportBatchStatus> {
  return api.get<ImportBatchStatus>(`/words/import/${batchId}`);
}

export function retryWord(wordId: string): Promise<CreateWordResult> {
  return api.post<CreateWordResult>(`/words/${wordId}/retry`);
}

export function regenerateWord(wordId: string): Promise<CreateWordResult> {
  return api.post<CreateWordResult>(`/words/${wordId}/regenerate`);
}
