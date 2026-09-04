'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeDue } from '@/features/learning/format-session';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';
import type { SessionStats } from '@/features/learning/types';
import {
  dashboardLearningView,
  shouldShowLearningSideStats,
  type DashboardLearningView,
} from './dashboard-learning-state';

interface DashboardLearningPanelProps {
  stats?: SessionStats;
  isPending: boolean;
  isError: boolean;
  startPending: boolean;
  startError: string | null;
  onStartReview: () => void;
  onRetry: () => void;
  onAddWord: () => void;
}

export function DashboardLearningPanel({
  stats,
  isPending,
  isError,
  startPending,
  startError,
  onStartReview,
  onRetry,
  onAddWord,
}: DashboardLearningPanelProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const view = dashboardLearningView(stats, isPending, isError);

  return (
    <div className="flex flex-col gap-6">
      <DueCard
        view={view}
        locale={locale}
        startPending={startPending}
        startError={startError}
        onStartReview={onStartReview}
        onRetry={onRetry}
        onAddWord={onAddWord}
      />
      {stats && shouldShowLearningSideStats(stats, view) ? <SideStats stats={stats} /> : null}
      {stats?.dailyNewWordLimit.remaining === 0 ? (
        <p className={theme.warnSurface} role="status">
          {t('dailyLimit', { limit: stats.dailyNewWordLimit.limit })}
        </p>
      ) : null}
      {stats && stats.queueCount >= 50 ? (
        <p className={theme.warnSurface} role="status">
          {t('queueWarning', { count: stats.queueCount })}
        </p>
      ) : null}
    </div>
  );
}

function DueCard({
  view,
  locale,
  startPending,
  startError,
  onStartReview,
  onRetry,
  onAddWord,
}: {
  view: DashboardLearningView;
  locale: string;
  startPending: boolean;
  startError: string | null;
  onStartReview: () => void;
  onRetry: () => void;
  onAddWord: () => void;
}) {
  const t = useTranslations('dashboard');

  if (view.kind === 'loading') {
    return (
      <section className="rounded-lg bg-bg-elevated px-6 py-8" aria-busy="true" aria-label={t('loadingStats')}>
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto mt-6 h-12 w-40" />
      </section>
    );
  }

  if (view.kind === 'error') {
    return (
      <section className={cn(theme.errorSurface, 'flex flex-col gap-3')} role="alert">
        <p className="m-0">{t('statsError')}</p>
        <Button type="button" variant="secondary" onClick={onRetry}>
          {t('retryStats')}
        </Button>
      </section>
    );
  }

  if (view.kind === 'new-user') {
    return (
      <section className="rounded-lg bg-bg-elevated px-6 py-8 text-center">
        <p className="m-0 text-display">{t('newUser')}</p>
        <Button type="button" size="lg" className="mt-6" onClick={onAddWord}>
          {t('addFirst')}
        </Button>
      </section>
    );
  }

  if (view.kind === 'caught-up') {
    return (
      <section className="rounded-lg bg-bg-elevated px-6 py-8 text-center">
        <p className="m-0 text-display">{t('caughtUp')}</p>
        {view.nextDueAt ? (
          <p className={cn('mt-3 mb-0', theme.muted)}>
            {t('nextDue', { time: formatRelativeDue(view.nextDueAt, locale) })}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-bg-elevated px-6 py-8 text-center">
      <p className="m-0 text-display text-warm">{t('dueCount', { count: view.count })}</p>
      <Button
        type="button"
        size="lg"
        className="mt-6"
        autoFocus
        isLoading={startPending}
        onClick={onStartReview}
      >
        {t('startReview')}
      </Button>
      {startError ? (
        <p className={cn('mt-3 mb-0', theme.errorText)} role="alert">
          {startError}
        </p>
      ) : null}
    </section>
  );
}

function SideStats({ stats }: { stats: SessionStats }) {
  const t = useTranslations('dashboard');
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="m-0 text-title">{stats.queueCount}</p>
        <p className={cn('m-0 text-sm', theme.muted)}>{t('queueStat')}</p>
      </div>
      <div>
        <p className="m-0 text-title">{stats.graduatedCount}</p>
        <p className={cn('m-0 text-sm', theme.muted)}>{t('graduatedStat')}</p>
      </div>
    </div>
  );
}
