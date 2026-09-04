import { describe, expect, it } from 'vitest';
import {
  dashboardLearningView,
  shouldShowLearningSideStats,
} from '@/features/dashboard/dashboard-learning-state';
import type { SessionStats } from '@/features/learning/types';

function stats(overrides: Partial<SessionStats> = {}): SessionStats {
  return {
    asOf: '2026-09-04T12:00:00.000Z',
    dueTodayCount: 0,
    nextDueAt: null,
    totalLearningWords: 0,
    queueCount: 0,
    graduatedCount: 0,
    sessionWordCount: 10,
    dailyNewWordLimit: { limit: 3, used: 0, remaining: 3 },
    ...overrides,
  };
}

describe('dashboardLearningView', () => {
  it('shows loading then error without cached stats', () => {
    expect(dashboardLearningView(undefined, true, false)).toEqual({ kind: 'loading' });
    expect(dashboardLearningView(undefined, false, true)).toEqual({ kind: 'error' });
  });

  it('treats a learner with no official words as a new user', () => {
    expect(dashboardLearningView(stats(), false, false)).toEqual({ kind: 'new-user' });
  });

  it('surfaces due count as the primary action', () => {
    expect(dashboardLearningView(stats({ dueTodayCount: 12, totalLearningWords: 46 }), false, false)).toEqual({
      kind: 'due',
      count: 12,
    });
  });

  it('shows next due when caught up', () => {
    expect(
      dashboardLearningView(
        stats({
          totalLearningWords: 8,
          nextDueAt: '2026-09-05T08:00:00.000Z',
        }),
        false,
        false,
      ),
    ).toEqual({ kind: 'caught-up', nextDueAt: '2026-09-05T08:00:00.000Z' });
  });

  it('hides zero side stats for a brand-new user', () => {
    const view = dashboardLearningView(stats(), false, false);
    expect(shouldShowLearningSideStats(stats(), view)).toBe(false);
    expect(shouldShowLearningSideStats(stats({ queueCount: 4 }), view)).toBe(true);
  });
});
