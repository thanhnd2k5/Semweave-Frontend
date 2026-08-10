import { describe, expect, it } from 'vitest';
import { getWordContent, toHealthLevel } from '@/features/words/types';

describe('word preview data', () => {
  it('parses a valid generated word package', () => {
    expect(
      getWordContent({
        definition_en: 'Lasting briefly.',
        definition_vi: 'Tồn tại ngắn ngủi.',
        pronunciation: '/ɪˈfem.ər.əl/',
        examples: [{ sentence: 'The moment was brief.', translation_vi: 'Khoảnh khắc ngắn ngủi.' }],
      }),
    ).toEqual({
      definition_en: 'Lasting briefly.',
      definition_vi: 'Tồn tại ngắn ngủi.',
      pronunciation: '/ɪˈfem.ər.əl/',
      examples: [{ sentence: 'The moment was brief.', translation_vi: 'Khoảnh khắc ngắn ngủi.' }],
      semanticTags: undefined,
    });
  });

  it('falls back safely for malformed content', () => {
    expect(getWordContent(null)).toBeNull();
    expect(getWordContent({ definition_en: 'Only English' })).toBeNull();
  });

  it('clamps health levels to supported badge levels', () => {
    expect(toHealthLevel(0)).toBe(1);
    expect(toHealthLevel(2)).toBe(2);
    expect(toHealthLevel(3)).toBe(3);
    expect(toHealthLevel(9)).toBe(4);
  });
});
