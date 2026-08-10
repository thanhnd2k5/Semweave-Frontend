import { api } from '@/lib/api-client';
import type {
  AmbiguityResult,
  CreateWordResult,
  DuplicateCheckResult,
  WordDetail,
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

export function retryWord(wordId: string): Promise<CreateWordResult> {
  return api.post<CreateWordResult>(`/words/${wordId}/retry`);
}

export function regenerateWord(wordId: string): Promise<CreateWordResult> {
  return api.post<CreateWordResult>(`/words/${wordId}/regenerate`);
}
