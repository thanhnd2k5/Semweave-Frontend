import type { SessionStats } from '@/features/learning/types';

export type DashboardLearningView =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'new-user' }
  | { kind: 'due'; count: number }
  | { kind: 'caught-up'; nextDueAt: string | null };

export function dashboardLearningView(
  stats: SessionStats | undefined,
  _isPending: boolean,
  isError: boolean,
): DashboardLearningView {
  if (!stats) {
    if (isError) return { kind: 'error' };
    return { kind: 'loading' };
  }
  if (stats.dueTodayCount > 0) return { kind: 'due', count: stats.dueTodayCount };
  if (stats.totalLearningWords === 0) return { kind: 'new-user' };
  return { kind: 'caught-up', nextDueAt: stats.nextDueAt };
}

export function shouldShowLearningSideStats(stats: SessionStats, view: DashboardLearningView): boolean {
  if (view.kind === 'new-user') {
    return stats.queueCount > 0 || stats.graduatedCount > 0;
  }
  return view.kind === 'due' || view.kind === 'caught-up';
}
