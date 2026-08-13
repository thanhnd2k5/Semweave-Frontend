'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { WordHealthBadge } from '@/components/ui/WordHealthBadge';
import { ROUTES } from '@/common/constants/routes';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { Link, useRouter } from '@/infrastructure/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCanonicalPage } from '@/lib/pagination';
import { privateQueryKeys } from '@/lib/private-query';
import { theme } from '@/lib/theme-classes';
import { listWords } from './api';
import { getWordContent, toHealthLevel, type WordSort, type WordStatus } from './types';

const VALID_STATUSES = new Set<WordStatus>(['PENDING', 'FAILED', 'OFFICIAL', 'GRADUATED']);
const VALID_SORTS = new Set<WordSort>(['newest', 'oldest', 'term-asc', 'term-desc']);

export function WordListContent() {
  const t = useTranslations('words.library');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const queryIdentity = useQueryIdentity();
  const searchParams = useSearchParams();
  const queryText = searchParams.get('q') ?? '';
  const statusParam = searchParams.get('status') ?? '';
  const tagParam = searchParams.get('tag') ?? '';
  const sortParam = searchParams.get('sort') ?? 'newest';
  const pageParam = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const status = VALID_STATUSES.has(statusParam as WordStatus)
    ? (statusParam as WordStatus)
    : undefined;
  const sort = VALID_SORTS.has(sortParam as WordSort) ? (sortParam as WordSort) : 'newest';
  const wordsQuery = useQuery({
    queryKey: privateQueryKeys.wordList(queryIdentity, [
      page,
      queryText,
      status,
      tagParam,
      sort,
    ]),
    queryFn: () =>
      listWords({
        page,
        pageSize: 20,
        q: queryText || undefined,
        statuses: status ? [status] : undefined,
        tag: tagParam || undefined,
        sort,
      }),
  });

  function navigate(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, String(value));
    }
    const query = params.toString();
    router.replace(query ? `${ROUTES.words}?${query}` : ROUTES.words);
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextSearch = String(form.get('word-search') ?? '').trim();
    const nextStatus = String(form.get('word-status') ?? '');
    const nextTag = String(form.get('word-tag') ?? '').trim().toLowerCase();
    const nextSort = String(form.get('word-sort') ?? 'newest') as WordSort;
    navigate({
      q: nextSearch || undefined,
      status: nextStatus || undefined,
      tag: nextTag || undefined,
      sort: nextSort === 'newest' ? undefined : nextSort,
      page: undefined,
    });
  }

  const result = wordsQuery.data;
  const hasFilters = Boolean(queryText || status || tagParam || sort !== 'newest');

  useEffect(() => {
    if (!result) return;

    const canonicalPage = getCanonicalPage(page, result.meta.totalPages);
    if (canonicalPage === null) return;

    const params = new URLSearchParams(searchParams.toString());
    if (canonicalPage === 1) params.delete('page');
    else params.set('page', String(canonicalPage));
    const query = params.toString();
    router.replace(query ? `${ROUTES.words}?${query}` : ROUTES.words);
  }, [page, result, router, searchParams]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display">{t('title')}</h1>
          {result ? <p className={cn('mt-1 mb-0', theme.muted)}>{t('count', { count: result.meta.total })}</p> : null}
        </div>
        <Link href={ROUTES.wordsNew} className={theme.navButtonSecondary}>
          {t('addWord')}
        </Link>
      </div>

      <form key={searchParams.toString()} className={cn(theme.surface, 'grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-5')} onSubmit={applyFilters}>
        <div className="lg:col-span-2">
          <Input
            label={t('searchLabel')}
            name="word-search"
            defaultValue={queryText}
            placeholder={t('searchPlaceholder')}
          />
        </div>
        <label className={cn('flex flex-col gap-1 text-sm font-medium', theme.muted)}>
          {t('statusLabel')}
          <select
            className={theme.input}
            name="word-status"
            defaultValue={status ?? ''}
          >
            <option value="">{t('statusAll')}</option>
            <option value="PENDING">{t('statusPending')}</option>
            <option value="FAILED">{t('statusFailed')}</option>
            <option value="OFFICIAL">{t('statusOfficial')}</option>
            <option value="GRADUATED">{t('statusGraduated')}</option>
          </select>
        </label>
        <Input
          label={t('tagLabel')}
          name="word-tag"
          defaultValue={tagParam}
          placeholder={t('tagPlaceholder')}
        />
        <label className={cn('flex flex-col gap-1 text-sm font-medium', theme.muted)}>
          {t('sortLabel')}
          <select
            className={theme.input}
            name="word-sort"
            defaultValue={sort}
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="oldest">{t('sortOldest')}</option>
            <option value="term-asc">{t('sortTermAsc')}</option>
            <option value="term-desc">{t('sortTermDesc')}</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-2 lg:col-span-5">
          <Button type="submit" size="sm">{t('apply')}</Button>
          {hasFilters ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => router.replace(ROUTES.words)}>
              {t('clear')}
            </Button>
          ) : null}
        </div>
      </form>

      {wordsQuery.isPending ? <WordListSkeleton /> : null}

      {wordsQuery.isError ? (
        <section className={theme.errorSurface} role="alert">
          <p className="m-0">{t('loadError')}</p>
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => void wordsQuery.refetch()}>
            {tCommon('retry')}
          </Button>
        </section>
      ) : null}

      {result && result.items.length === 0 ? (
        <section className={cn(theme.surface, 'flex flex-col items-start gap-4 p-6')}>
          <p className="m-0">{hasFilters ? t('noResults') : t('empty')}</p>
          {hasFilters ? (
            <Button type="button" variant="secondary" onClick={() => router.replace(ROUTES.words)}>
              {t('clear')}
            </Button>
          ) : (
            <Link href={ROUTES.wordsNew} className={theme.navButtonSecondary}>{t('addWord')}</Link>
          )}
        </section>
      ) : null}

      {result?.items.length ? (
        <ul className="m-0 grid list-none gap-3 p-0">
          {result.items.map((word) => {
            const content = getWordContent(word.content);
            const definition = locale === 'vi' ? content?.definition_vi : content?.definition_en;
            return (
              <li key={word.id} className={cn(theme.surface, 'p-5')}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={ROUTES.wordDetail(word.id)} className="text-word font-semibold text-text-primary hover:text-accent hover:underline" aria-label={t('openWord', { word: word.term })}>
                      {word.term}
                    </Link>
                    <p className={cn('mt-2 mb-0 line-clamp-2', theme.muted)}>{definition ?? t('definitionMissing')}</p>
                    {word.tags.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {word.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                      </div>
                    ) : null}
                  </div>
                  <WordStatusMeta word={word} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {result && result.meta.totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-4" aria-label={t('page', { page: result.meta.page, totalPages: result.meta.totalPages })}>
          <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}>{t('previous')}</Button>
          <span className={theme.muted}>{t('page', { page: result.meta.page, totalPages: result.meta.totalPages })}</span>
          <Button type="button" variant="secondary" disabled={page >= result.meta.totalPages} onClick={() => navigate({ page: page + 1 })}>{t('next')}</Button>
        </nav>
      ) : null}
    </main>
  );
}

function WordStatusMeta({ word }: { word: { status: WordStatus; health: { depthLevel: number } | null } }) {
  const t = useTranslations('words.library');
  if (word.status === 'PENDING') return <Badge variant="accent">{t('statusPending')}</Badge>;
  if (word.status === 'FAILED') return <Badge variant="error">{t('statusFailed')}</Badge>;
  if (word.status === 'GRADUATED') return <Badge variant="success">{t('statusGraduated')}</Badge>;
  return <WordHealthBadge level={toHealthLevel(word.health?.depthLevel)} />;
}

function WordListSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden>
      {[0, 1, 2].map((item) => (
        <div key={item} className={cn(theme.surface, 'flex flex-col gap-3 p-5')}>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-full max-w-xl" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}
