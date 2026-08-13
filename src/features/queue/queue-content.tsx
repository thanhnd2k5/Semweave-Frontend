'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ROUTES } from '@/common/constants/routes';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { Link, useRouter } from '@/infrastructure/i18n/navigation';
import { getWordContent } from '@/features/words/types';
import { cn } from '@/lib/cn';
import { getCanonicalPage } from '@/lib/pagination';
import { privateQueryKeys } from '@/lib/private-query';
import { theme } from '@/lib/theme-classes';
import { listQueue, processQueue, removeQueueItem } from './api';
import {
  markQueueWordsPending,
  shouldPollForQueueCount,
  shouldPollQueue,
  type QueuePollTarget,
} from './queue-state';
import type { QueueListResult } from './types';

export function QueueContent() {
  const t = useTranslations('queue');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const formatter = useFormatter();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryIdentity = useQueryIdentity();
  const pageParam = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const [processCount, setProcessCount] = useState(3);
  const hadPendingItems = useRef(false);
  const postProcessPollTarget = useRef<QueuePollTarget | null>(null);
  const navigate = useCallback((nextPage: number) => {
    router.replace(nextPage > 1 ? `${ROUTES.queue}?page=${nextPage}` : ROUTES.queue);
  }, [router]);

  const queueQuery = useQuery({
    queryKey: privateQueryKeys.queuePage(queryIdentity, page),
    queryFn: () => listQueue(page, 20),
    refetchInterval: (query) => {
      const result = query.state.data;
      const shouldPollCount = shouldPollForQueueCount(
        postProcessPollTarget.current,
        result?.summary.count,
        Date.now(),
      );
      if (!shouldPollCount) postProcessPollTarget.current = null;
      return shouldPollQueue(result?.items) || shouldPollCount ? 1000 : false;
    },
  });
  const removeMutation = useMutation({
    mutationFn: removeQueueItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.queue(queryIdentity),
      });
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.words(queryIdentity),
      });
    },
  });
  const processMutation = useMutation({
    mutationFn: processQueue,
    onSuccess: (result) => {
      const acceptedWordIds = new Set(
        result.accepted
          .filter((word) => word.status === 'PENDING')
          .map((word) => word.wordId),
      );
      const currentQueue = queryClient.getQueryData<QueueListResult>(
        privateQueryKeys.queuePage(queryIdentity, page),
      );
      if (acceptedWordIds.size > 0 && currentQueue) {
        const previousTarget = postProcessPollTarget.current?.count;
        postProcessPollTarget.current = {
          count: Math.max(
            0,
            (previousTarget ?? currentQueue.summary.count) - acceptedWordIds.size,
          ),
          expiresAt: Date.now() + 30_000,
        };
      }
      queryClient.setQueriesData<QueueListResult>(
        { queryKey: privateQueryKeys.queue(queryIdentity) },
        (current) => markQueueWordsPending(current, acceptedWordIds),
      );
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.queue(queryIdentity),
      });
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.words(queryIdentity),
      });
    },
  });

  useEffect(() => {
    const hasPendingItems = shouldPollQueue(queueQuery.data?.items);
    if (hadPendingItems.current && !hasPendingItems) {
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.words(queryIdentity),
      });
    }
    hadPendingItems.current = hasPendingItems;
  }, [queryClient, queryIdentity, queueQuery.data]);

  useEffect(() => {
    const result = queueQuery.data;
    if (!result) return;

    const canonicalPage = getCanonicalPage(page, result.meta.totalPages);
    if (canonicalPage !== null) navigate(canonicalPage);
  }, [navigate, page, queueQuery.data]);

  if (queueQuery.isPending) {
    return <main className="mx-auto w-full max-w-4xl"><p className={theme.muted}>{t('description')}</p></main>;
  }

  if (queueQuery.isError) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <section className={theme.errorSurface} role="alert">{t('loadError')}</section>
        <Button type="button" variant="secondary" onClick={() => void queueQuery.refetch()}>{tCommon('retry')}</Button>
      </main>
    );
  }

  const result = queueQuery.data;
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-display">{t('title')}</h1>
        <p className={cn('mt-2 mb-0', theme.muted)}>{t('description')}</p>
        <p className="mt-2 mb-0 font-medium">{t('count', { count: result.summary.count })}</p>
      </div>

      {result.summary.count >= result.summary.warningThreshold ? (
        <section className={theme.warnSurface} role="status">{t('warning', { count: result.summary.count })}</section>
      ) : null}

      {result.summary.count > 0 ? (
        <section className={cn(theme.surface, 'flex flex-wrap items-end gap-4 p-4')}>
          <label className={cn('flex min-w-40 flex-col gap-1 text-sm font-medium', theme.muted)}>
            {t('processLabel')}
            <select className={theme.input} value={processCount} onChange={(event) => setProcessCount(Number(event.target.value))}>
              {[1, 2, 3, 5].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <Button type="button" isLoading={processMutation.isPending} onClick={() => processMutation.mutate(processCount)}>
            {processMutation.isPending ? t('processing') : t('process')}
          </Button>
        </section>
      ) : null}

      {processMutation.data ? (
        <section className={processMutation.data.accepted.length ? cn(theme.surface, 'p-4') : theme.warnSurface} role="status">
          {processMutation.data.accepted.length
            ? t('processed', { count: processMutation.data.accepted.length, remaining: processMutation.data.dailyRemaining })
            : t('noQuota')}
        </section>
      ) : null}
      {processMutation.isError || removeMutation.isError ? <section className={theme.errorSurface} role="alert">{t('actionError')}</section> : null}

      {result.items.length === 0 ? (
        <section className={cn(theme.surface, 'flex flex-col items-start gap-3 p-6')}>
          <p className="m-0 font-medium">{t('empty')}</p>
          <p className={cn('m-0', theme.muted)}>{t('emptyHint')}</p>
          <Link href={ROUTES.words} className={theme.navButtonSecondary}>{t('browseWords')}</Link>
        </section>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {result.items.map((item) => {
            const content = getWordContent(item.word.content);
            const definition = locale === 'vi' ? content?.definition_vi : content?.definition_en;
            return (
              <li key={item.id} className={cn(theme.surface, 'flex flex-wrap items-start justify-between gap-4 p-5')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={ROUTES.wordDetail(item.word.id)} className="text-word font-semibold text-text-primary hover:text-accent hover:underline">{item.word.term}</Link>
                    <QueueStatusBadge status={item.word.status} />
                  </div>
                  {definition ? <p className={cn('mt-2 mb-0 line-clamp-2', theme.muted)}>{definition}</p> : null}
                  <p className={cn('mt-2 mb-0 text-sm', theme.muted)}>
                    {t('addedAt', {
                      date: formatter.dateTime(new Date(item.addedAt), { dateStyle: 'medium' }),
                    })}
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" disabled={item.word.status === 'PENDING'} isLoading={removeMutation.isPending && removeMutation.variables === item.word.id} onClick={() => removeMutation.mutate(item.word.id)} aria-label={t('remove', { word: item.word.term })}>
                  {t('remove', { word: item.word.term })}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {result.meta.totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-4" aria-label={t('page', { page: result.meta.page, totalPages: result.meta.totalPages })}>
          <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => navigate(page - 1)}>{t('previous')}</Button>
          <span className={theme.muted}>{t('page', { page: result.meta.page, totalPages: result.meta.totalPages })}</span>
          <Button type="button" variant="secondary" disabled={page >= result.meta.totalPages} onClick={() => navigate(page + 1)}>{t('next')}</Button>
        </nav>
      ) : null}
    </main>
  );
}

function QueueStatusBadge({ status }: { status: QueueListResult['items'][number]['word']['status'] }) {
  const t = useTranslations('queue');
  const label = {
    PENDING: t('statusPending'),
    FAILED: t('statusFailed'),
    SHADOW: t('statusShadow'),
    OFFICIAL: t('statusOfficial'),
    GRADUATED: t('statusGraduated'),
  }[status];
  const variant = status === 'FAILED' ? 'error' : status === 'PENDING' ? 'accent' : status === 'SHADOW' ? 'neutral' : 'success';
  return <Badge variant={variant}>{label}</Badge>;
}
