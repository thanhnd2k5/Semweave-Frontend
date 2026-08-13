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
  isQueued?: boolean;
}

export interface WordQuizSummary {
  id: string;
  type: string;
  difficulty: number;
}

export interface WordDetail {
  id: string;
  term: string;
  normalizedTerm: string;
  tags: string[];
  status: WordStatus;
  content: unknown;
  addedAt: string;
  learningStartedAt: string | null;
  updatedAt: string;
  health: WordHealth | null;
  isQueued?: boolean;
  quizzes?: WordQuizSummary[];
  shadows?: WordShadow[];
}

export type WordSort = 'newest' | 'oldest' | 'term-asc' | 'term-desc';

export interface WordListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  statuses?: WordStatus[];
  tag?: string;
  sort?: WordSort;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WordListResult {
  items: WordDetail[];
  meta: PaginationMeta;
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

export type ImportSkipReason =
  | 'INVALID_TERM'
  | 'DUPLICATE_IN_BATCH'
  | 'ALREADY_EXISTS'
  | 'DAILY_LIMIT_REACHED';

export interface ImportSkip {
  term: string;
  reason: ImportSkipReason;
  wordId?: string;
  status?: WordStatus;
}

export interface ImportWordsResult {
  batchId: string;
  requestedCount: number;
  accepted: Array<{ wordId: string; term: string; status: 'PENDING' | 'FAILED' }>;
  skipped: ImportSkip[];
}

export interface ImportBatchStatus {
  batchId: string;
  requestedCount: number;
  acceptedCount: number;
  pendingCount: number;
  officialCount: number;
  failedCount: number;
  progress: number;
  status: 'PROCESSING' | 'COMPLETE' | 'COMPLETE_WITH_ERRORS';
  words: Array<{ wordId: string; term: string; status: WordStatus }>;
  skipped: ImportSkip[];
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
