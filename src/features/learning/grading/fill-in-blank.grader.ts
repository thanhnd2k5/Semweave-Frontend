export const GRADING_VERSION = 1 as const;

export type FillInGradeResult = {
  isCorrect: boolean;
  matchedVariant: string | null;
  gradingVersion: typeof GRADING_VERSION;
};

export function normalizeAnswer(raw: string): string {
  return raw.normalize('NFKC').replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/gu, '').toLowerCase();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }

  return prev[b.length];
}

/** Mirrors backend gradingVersion 1 — keep in sync via fill-in-blank.v1.json fixtures. */
export function gradeFillInBlank(input: {
  userAnswer: string;
  correctAnswer: string;
  acceptedVariants?: string[];
}): FillInGradeResult {
  const normalizedUser = normalizeAnswer(input.userAnswer);
  if (normalizedUser.length === 0) {
    return { isCorrect: false, matchedVariant: null, gradingVersion: GRADING_VERSION };
  }

  const correct = normalizeAnswer(input.correctAnswer);
  const variants = (input.acceptedVariants ?? []).map((variant) => ({
    raw: variant,
    normalized: normalizeAnswer(variant),
  }));

  if (normalizedUser === correct) {
    return { isCorrect: true, matchedVariant: null, gradingVersion: GRADING_VERSION };
  }

  for (const variant of variants) {
    if (variant.normalized.length > 0 && normalizedUser === variant.normalized) {
      return {
        isCorrect: true,
        matchedVariant: variant.raw,
        gradingVersion: GRADING_VERSION,
      };
    }
  }

  if (levenshteinDistance(normalizedUser, correct) <= 1) {
    return {
      isCorrect: true,
      matchedVariant: input.correctAnswer,
      gradingVersion: GRADING_VERSION,
    };
  }

  for (const variant of variants) {
    if (
      variant.normalized.length > 0 &&
      levenshteinDistance(normalizedUser, variant.normalized) <= 1
    ) {
      return {
        isCorrect: true,
        matchedVariant: variant.raw,
        gradingVersion: GRADING_VERSION,
      };
    }
  }

  return { isCorrect: false, matchedVariant: null, gradingVersion: GRADING_VERSION };
}
