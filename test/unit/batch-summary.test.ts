import { describe, expect, it } from 'vitest';
import { countImportSkips } from '@/features/dashboard/batch-summary';

describe('batch import summary', () => {
  it('keeps each server skip reason separate', () => {
    expect(countImportSkips([
      { term: 'ephemeral', reason: 'DUPLICATE_IN_BATCH' },
      { term: 'fleeting', reason: 'ALREADY_EXISTS', wordId: 'word-1' },
      { term: 'transient', reason: 'DAILY_LIMIT_REACHED' },
      { term: '', reason: 'INVALID_TERM' },
      { term: 'brief', reason: 'DAILY_LIMIT_REACHED' },
    ])).toEqual({
      INVALID_TERM: 1,
      DUPLICATE_IN_BATCH: 1,
      ALREADY_EXISTS: 1,
      DAILY_LIMIT_REACHED: 2,
    });
  });
});
