import { describe, expect, it } from 'vitest';
import { parseBatchTerms } from '@/features/words/batch-parser';

describe('parseBatchTerms', () => {
  it('trims terms and removes blank and duplicate lines while preserving order', () => {
    expect(parseBatchTerms(' ephemeral \n\nTransient\nephemeral\nfleeting')).toEqual({
      terms: ['ephemeral', 'Transient', 'fleeting'],
      inputCount: 5,
      blankCount: 1,
      duplicateCount: 1,
      tooLongCount: 0,
    });
  });

  it('reports overlong lines without returning them', () => {
    const result = parseBatchTerms(`valid\n${'x'.repeat(101)}`);
    expect(result.terms).toEqual(['valid']);
    expect(result.tooLongCount).toBe(1);
  });
});
