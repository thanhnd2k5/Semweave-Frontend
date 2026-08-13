import type { WordDetail } from './types';

/** Keeps relation-only detail fields when PATCH /words/:id returns a compact word. */
export function mergeWordDetail(
  current: WordDetail | undefined,
  updated: WordDetail,
): WordDetail {
  if (!current) return updated;

  return {
    ...current,
    ...updated,
    quizzes: updated.quizzes ?? current.quizzes,
    shadows: updated.shadows ?? current.shadows,
    isQueued: updated.isQueued ?? current.isQueued,
  };
}
