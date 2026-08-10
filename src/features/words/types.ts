export type WordStatus = 'PENDING' | 'FAILED' | 'SHADOW' | 'OFFICIAL' | 'GRADUATED';

export interface WordHealth {
  depthLevel: number;
  totalAttempts: number;
  currentStreak: number;
}

export interface WordExample {
  sentence: string;
  translation_vi?: string;
}

export interface WordContent {
  definition_en: string;
  definition_vi: string;
  pronunciation?: string | null;
  examples: WordExample[];
  semanticTags?: string[];
}

export interface WordShadow {
  id: string;
  term: string;
  status: WordStatus;
}

export interface WordDetail {
  id: string;
  term: string;
  normalizedTerm: string;
  tags: string[];
  status: WordStatus;
  content: unknown;
  addedAt: string;
  updatedAt: string;
  health: WordHealth | null;
  shadows?: WordShadow[];
}

export type DuplicateCheckResult =
  | { exists: false }
  | { exists: true; word: WordDetail };

export interface AmbiguitySense {
  label: string;
  description: string;
}

export interface AmbiguityResult {
  ambiguous: boolean;
  question?: string;
  senses?: AmbiguitySense[];
}

export interface CreateWordResult {
  wordId: string;
  status: 'PENDING';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/** Safely narrows the JSON content returned by the words API for preview rendering. */
export function getWordContent(value: unknown): WordContent | null {
  if (!isRecord(value)) return null;

  const definitionEn = asString(value.definition_en);
  const definitionVi = asString(value.definition_vi);
  if (!definitionEn || !definitionVi) return null;

  const examples = Array.isArray(value.examples)
    ? value.examples.flatMap((example) => {
        if (!isRecord(example)) return [];
        const sentence = asString(example.sentence);
        if (!sentence) return [];
        const translationVi = asString(example.translation_vi);
        return [{ sentence, ...(translationVi ? { translation_vi: translationVi } : {}) }];
      })
    : [];

  return {
    definition_en: definitionEn,
    definition_vi: definitionVi,
    pronunciation: typeof value.pronunciation === 'string' ? value.pronunciation : null,
    examples,
    semanticTags: Array.isArray(value.semanticTags)
      ? value.semanticTags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
  };
}

export function toHealthLevel(level: number | undefined): 1 | 2 | 3 | 4 {
  if (!level || level <= 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 3;
  return 4;
}
