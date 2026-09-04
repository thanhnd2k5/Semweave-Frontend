'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/infrastructure/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/common/constants/routes';
import { useAuth } from '@/features/_optional/auth/use-auth';
import { getSessionStats } from '@/features/learning/api';
import { learningQueryKeys } from '@/features/learning/learning-query-keys';
import { useStartStudySession } from '@/features/learning/use-start-study-session';
import { usePendingSyncCount } from '@/features/learning/offline/use-pending-sync-count';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { ANONYMOUS_QUERY_IDENTITY } from '@/lib/private-query';
import { theme } from '@/lib/theme-classes';
import { BatchProgressBanner } from './batch-progress-banner';
import { DashboardLearningPanel } from './dashboard-learning-panel';

export function DashboardContent() {
  const t = useTranslations('dashboard');
  const tAuth = useTranslations('auth');
  const queryIdentity = useQueryIdentity();
  const router = useRouter();
  const { logout, isAuthenticated } = useAuth();
  const { startDueToday, pending: startPending, error: startError } = useStartStudySession();
  const pendingSyncCount = usePendingSyncCount(queryIdentity);

  const statsQuery = useQuery({
    queryKey: learningQueryKeys.stats(queryIdentity),
    queryFn: getSessionStats,
    enabled: queryIdentity !== ANONYMOUS_QUERY_IDENTITY,
    retry: false,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <BatchProgressBanner />
      {pendingSyncCount > 0 ? (
        <p className={theme.warnSurface} role="status">
          {t('pendingSync')}
        </p>
      ) : null}

      <h1 className="m-0 text-title">{t('title')}</h1>

      <DashboardLearningPanel
        stats={statsQuery.data}
        isPending={statsQuery.isPending}
        isError={statsQuery.isError}
        startPending={startPending}
        startError={startError}
        onStartReview={() => void startDueToday()}
        onRetry={() => void statsQuery.refetch()}
        onAddWord={() => router.push(ROUTES.wordsNew)}
      />

      <nav className="flex flex-wrap items-center gap-4">
        {isAuthenticated ? (
          <Button variant="secondary" onClick={() => void logout()}>
            {tAuth('logout')}
          </Button>
        ) : null}
        <Link href={ROUTES.settings} className={theme.linkMuted}>
          {t('settings')}
        </Link>
        <Link href={ROUTES.wordsNew} className={theme.link}>
          {t('addWord')}
        </Link>
        <Link href={ROUTES.words} className={theme.link}>
          {t('wordLibrary')}
        </Link>
        <Link href={ROUTES.queue} className={theme.link}>
          {t('queue')}
        </Link>
      </nav>
    </main>
  );
}
