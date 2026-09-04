'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ROUTES } from '@/common/constants/routes';
import { ApiError } from '@/common/errors/api-error';
import { LinearProgress } from '@/components/ui/LinearProgress';
import { invalidateLearningStats } from '@/features/learning/learning-query-keys';
import { getImportBatch } from '@/features/words/api';
import type { ImportSkip } from '@/features/words/types';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { Link, useRouter } from '@/infrastructure/i18n/navigation';
import { cn } from '@/lib/cn';
import { privateQueryKeys } from '@/lib/private-query';
import { theme } from '@/lib/theme-classes';
import { countImportSkips } from './batch-summary';

export function BatchProgressBanner() {
  const t = useTranslations('dashboard.batch');
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryIdentity = useQueryIdentity();
  const [unavailableBatchId, setUnavailableBatchId] = useState<string | null>(null);
  const batchId = searchParams.get('batch');
  const batchQuery = useQuery({
    queryKey: privateQueryKeys.wordImport(queryIdentity, batchId ?? ''),
    queryFn: () => getImportBatch(batchId as string),
    enabled: Boolean(batchId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 1000 : false),
  });
  const batchStatus = batchQuery.data?.status;
  const batchError = batchQuery.isError
    ? ApiError.fromUnknown(batchQuery.error)
    : null;
  const batchUnavailable = batchError?.status === 404 || batchError?.code === 'NOT_FOUND';

  useEffect(() => {
    if (batchStatus === 'COMPLETE' || batchStatus === 'COMPLETE_WITH_ERRORS') {
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.wordList(queryIdentity),
      });
      void invalidateLearningStats(queryClient, queryIdentity);
    }
  }, [batchStatus, queryClient, queryIdentity]);

  useEffect(() => {
    if (!batchId || !batchUnavailable) return;

    // Preserve a short notice after removing the invalid query parameter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnavailableBatchId(batchId);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('batch');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${ROUTES.dashboard}?${nextQuery}` : ROUTES.dashboard);
  }, [batchId, batchUnavailable, router, searchParams]);

  useEffect(() => {
    if (!batchId || batchUnavailable) return;

    // A new valid batch supersedes any notice left by a previous invalid id.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnavailableBatchId(null);
  }, [batchId, batchUnavailable]);

  if (!batchId) {
    return unavailableBatchId
      ? <section className={theme.warnSurface} role="status">{t('notAvailable')}</section>
      : null;
  }

  if (batchQuery.isPending) {
    return (
      <section className={cn(theme.surface, 'flex flex-col gap-3 p-4')} aria-live="polite">
        <p className="m-0">{t('loading')}</p>
        <LinearProgress value={0} label={t('progressLabel')} />
      </section>
    );
  }

  if (batchQuery.isError) {
    return (
      <section className={batchUnavailable ? theme.warnSurface : theme.errorSurface} role={batchUnavailable ? 'status' : 'alert'}>
        {batchUnavailable ? t('notAvailable') : t('loadError')}
      </section>
    );
  }

  const batch = batchQuery.data;
  if (batch.status === 'PROCESSING') {
    return (
      <section className={cn(theme.surface, 'flex flex-col gap-3 p-4')} aria-live="polite">
        <p className="m-0">{t('progress', { count: batch.acceptedCount })}</p>
        <LinearProgress value={batch.progress} label={t('progressLabel')} />
        <BatchSkipSummary skipped={batch.skipped} muted />
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
      <BatchSkipSummary skipped={batch.skipped} />
      <Link href={hasErrors ? `${ROUTES.words}?status=FAILED` : ROUTES.words} className={cn('mt-3 inline-block', theme.link)}>
        {hasErrors ? t('viewFailed') : t('viewWords')}
      </Link>
    </section>
  );
}

function BatchSkipSummary({ skipped, muted = false }: { skipped: ImportSkip[]; muted?: boolean }) {
  const t = useTranslations('dashboard.batch');
  const counts = countImportSkips(skipped);
  const items = [
    counts.DUPLICATE_IN_BATCH > 0
      ? t('skippedDuplicate', { count: counts.DUPLICATE_IN_BATCH })
      : null,
    counts.ALREADY_EXISTS > 0
      ? t('skippedExisting', { count: counts.ALREADY_EXISTS })
      : null,
    counts.DAILY_LIMIT_REACHED > 0
      ? t('skippedQuota', { count: counts.DAILY_LIMIT_REACHED })
      : null,
    counts.INVALID_TERM > 0
      ? t('skippedInvalid', { count: counts.INVALID_TERM })
      : null,
  ].filter((item): item is string => item !== null);

  if (items.length === 0) return null;

  return (
    <ul className={cn('mt-2 mb-0 grid gap-1 pl-5 text-sm', muted && theme.muted)}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
