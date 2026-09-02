import type { ImportSkip, ImportSkipReason } from '@/features/words/types';

export type ImportSkipCounts = Record<ImportSkipReason, number>;

export function countImportSkips(skipped: readonly ImportSkip[]): ImportSkipCounts {
  return skipped.reduce<ImportSkipCounts>(
    (counts, item) => ({
      ...counts,
      [item.reason]: counts[item.reason] + 1,
    }),
    {
      INVALID_TERM: 0,
      DUPLICATE_IN_BATCH: 0,
      ALREADY_EXISTS: 0,
      DAILY_LIMIT_REACHED: 0,
    },
  );
}
