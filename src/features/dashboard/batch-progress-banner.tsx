'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ROUTES } from '@/common/constants/routes';
import { LinearProgress } from '@/components/ui/LinearProgress';
import { getImportBatch } from '@/features/words/api';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { Link } from '@/infrastructure/i18n/navigation';
import { cn } from '@/lib/cn';
import { privateQueryKeys } from '@/lib/private-query';
import { theme } from '@/lib/theme-classes';

export function BatchProgressBanner() {
  const t = useTranslations('dashboard.batch');
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const queryIdentity = useQueryIdentity();
  const batchId = searchParams.get('batch');
  const batchQuery = useQuery({
    queryKey: privateQueryKeys.wordImport(queryIdentity, batchId ?? ''),
    queryFn: () => getImportBatch(batchId as string),
    enabled: Boolean(batchId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 1000 : false),
  });
  const batchStatus = batchQuery.data?.status;

  useEffect(() => {
    if (batchStatus === 'COMPLETE' || batchStatus === 'COMPLETE_WITH_ERRORS') {
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.wordList(queryIdentity),
      });
    }
  }, [batchStatus, queryClient, queryIdentity]);

  if (!batchId) return null;

  if (batchQuery.isPending) {
    return (
      <section className={cn(theme.surface, 'flex flex-col gap-3 p-4')} aria-live="polite">
        <p className="m-0">{t('loading')}</p>
        <LinearProgress value={0} label={t('progressLabel')} />
      </section>
    );
  }

  if (batchQuery.isError) {
    return <section className={theme.errorSurface} role="alert">{t('loadError')}</section>;
  }

  const batch = batchQuery.data;
  if (batch.status === 'PROCESSING') {
    return (
      <section className={cn(theme.surface, 'flex flex-col gap-3 p-4')} aria-live="polite">
        <p className="m-0">{t('progress', { count: batch.acceptedCount })}</p>
        <LinearProgress value={batch.progress} label={t('progressLabel')} />
        {batch.skipped.length ? <p className={cn('m-0 text-sm', theme.muted)}>{t('skipped', { count: batch.skipped.length })}</p> : null}
      </section>
    );
  }

  const nothingAccepted = batch.acceptedCount === 0;
  const hasErrors = batch.status === 'COMPLETE_WITH_ERRORS';
  return (
    <section className={hasErrors ? theme.warnSurface : cn(theme.surface, 'p-4')} role="status">
      <p className="m-0 font-medium">
        {nothingAccepted
          ? t('nothingAccepted')
          : hasErrors
            ? t('completeWithErrors', { success: batch.officialCount, failed: batch.failedCount })
            : t('complete', { count: batch.officialCount })}
      </p>
      {batch.skipped.length ? <p className="mt-2 mb-0 text-sm">{t('skipped', { count: batch.skipped.length })}</p> : null}
      <Link href={hasErrors ? `${ROUTES.words}?status=FAILED` : ROUTES.words} className={cn('mt-3 inline-block', theme.link)}>
        {hasErrors ? t('viewFailed') : t('viewWords')}
      </Link>
    </section>
  );
}
