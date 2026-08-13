import { describe, expect, it } from 'vitest';
import { mergeWordDetail } from '@/features/words/word-cache';
import type { WordDetail } from '@/features/words/types';

const detail: WordDetail = {
  id: 'word-1',
  term: 'ephemeral',
  normalizedTerm: 'ephemeral',
  tags: ['reading'],
  status: 'OFFICIAL',
  content: null,
  addedAt: '2026-01-01T00:00:00.000Z',
  learningStartedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  health: null,
  isQueued: true,
  quizzes: [{ id: 'quiz-1', type: 'DEFINITION_MATCH', difficulty: 2 }],
  shadows: [{ id: 'shadow-1', term: 'fleeting', status: 'SHADOW' }],
};

describe('word detail cache', () => {
  it('preserves detail-only relations when a tag PATCH returns a compact word', () => {
    const compactUpdate = { ...detail, tags: ['reading', 'work'] };
    delete compactUpdate.quizzes;
    delete compactUpdate.shadows;
    delete compactUpdate.isQueued;

    const merged = mergeWordDetail(detail, compactUpdate);

    expect(merged.tags).toEqual(['reading', 'work']);
    expect(merged.quizzes).toEqual(detail.quizzes);
    expect(merged.shadows).toEqual(detail.shadows);
    expect(merged.isQueued).toBe(true);
  });
});
