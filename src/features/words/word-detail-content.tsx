'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ApiError } from '@/common/errors/api-error';
import { ROUTES } from '@/common/constants/routes';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { WordHealthBadge } from '@/components/ui/WordHealthBadge';
import { addQueueItem } from '@/features/queue/api';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { Link, useRouter } from '@/infrastructure/i18n/navigation';
import { cn } from '@/lib/cn';
import { privateQueryKeys } from '@/lib/private-query';
import { theme } from '@/lib/theme-classes';
import { deleteWord, getWord, retryWord, updateWordTags } from './api';
import { getWordContent, toHealthLevel, type WordDetail } from './types';
import { mergeWordDetail } from './word-cache';

export function WordDetailContent({ wordId }: { wordId: string }) {
  const t = useTranslations('words.detail');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryIdentity = useQueryIdentity();
  const [tagsDraft, setTagsDraft] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [queuedWordIds, setQueuedWordIds] = useState<Set<string>>(() => new Set());
  const previousStatus = useRef<WordDetail['status'] | undefined>(undefined);

  const wordQuery = useQuery({
    queryKey: privateQueryKeys.wordDetail(queryIdentity, wordId),
    queryFn: () => getWord(wordId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 1000 : false),
  });

  const retryMutation = useMutation({
    mutationFn: () => retryWord(wordId),
    onSuccess: () => {
      queryClient.setQueryData<WordDetail>(
        privateQueryKeys.wordDetail(queryIdentity, wordId),
        (current) => (current ? { ...current, status: 'PENDING' } : current),
      );
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.wordList(queryIdentity),
      });
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.queue(queryIdentity),
      });
    },
  });
  const tagsMutation = useMutation({
    mutationFn: (tags: string[]) => updateWordTags(wordId, tags),
    onSuccess: (word) => {
      queryClient.setQueryData<WordDetail>(
        privateQueryKeys.wordDetail(queryIdentity, wordId),
        (current) => mergeWordDetail(current, word),
      );
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.wordList(queryIdentity),
      });
      setTagsDraft(null);
      setTagError(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteWord(wordId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: privateQueryKeys.wordDetail(queryIdentity, wordId),
      });
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.wordList(queryIdentity),
      });
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.queue(queryIdentity),
      });
      router.replace(ROUTES.words);
    },
  });
  const queueMutation = useMutation({
    mutationFn: (targetWordId: string) => addQueueItem(targetWordId),
    onSuccess: (_, targetWordId) => {
      setQueuedWordIds((current) => new Set(current).add(targetWordId));
      queryClient.setQueryData<WordDetail>(
        privateQueryKeys.wordDetail(queryIdentity, targetWordId),
        (current) => (current ? { ...current, isQueued: true } : current),
      );
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.queue(queryIdentity),
      });
    },
  });

  useEffect(() => {
    const status = wordQuery.data?.status;
    if (!status) return;

    if (previousStatus.current === 'PENDING' && status !== 'PENDING') {
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.wordList(queryIdentity),
      });
      void queryClient.invalidateQueries({
        queryKey: privateQueryKeys.queue(queryIdentity),
      });
    }
    previousStatus.current = status;
  }, [queryClient, queryIdentity, wordQuery.data?.status]);

  if (wordQuery.isPending) {
    return <LoadingSpinner size="lg" label={tCommon('loading')} />;
  }

  if (wordQuery.isError) {
    const error = ApiError.fromUnknown(wordQuery.error);
    const notFound = error.code === 'NOT_FOUND';
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <section className={theme.errorSurface} role="alert">
          {notFound ? t('notFound') : t('loadError')}
        </section>
        {!notFound ? <Button type="button" variant="secondary" onClick={() => void wordQuery.refetch()}>{tCommon('retry')}</Button> : null}
        <Link href={ROUTES.words} className={theme.linkMuted}>← {t('back')}</Link>
      </main>
    );
  }

  const word = wordQuery.data;
  const content = getWordContent(word.content);
  const definition = locale === 'vi' ? content?.definition_vi : content?.definition_en;

  if (word.status === 'PENDING') {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6" aria-live="polite">
        <Link href={ROUTES.words} className={theme.linkMuted}>← {t('back')}</Link>
        <section className={cn(theme.surface, 'flex items-center gap-4 p-6')}>
          <LoadingSpinner size="lg" label={t('pending')} />
          <div>
            <h1 className="text-title">{word.term}</h1>
            <p className={cn('mt-1 mb-0', theme.muted)}>{t('pending')}</p>
          </div>
        </section>
      </main>
    );
  }

  if (word.status === 'FAILED') {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link href={ROUTES.words} className={theme.linkMuted}>← {t('back')}</Link>
        <section className={theme.errorSurface} role="alert">
          <h1 className="m-0 text-title">{word.term}</h1>
          <h2 className="mt-3 mb-0 font-semibold">{t('failedTitle')}</h2>
          <p className="mt-2 mb-0">{t('failedBody')}</p>
        </section>
        {retryMutation.isError ? <p className={theme.errorSurface}>{t('retryError')}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="button" size="lg" isLoading={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
            {t('retry')}
          </Button>
          <Button type="button" size="lg" variant="ghost" onClick={() => setDeleteOpen(true)}>
            {t('delete')}
          </Button>
        </div>
        <DeleteWordModal
          open={deleteOpen}
          word={word.term}
          isPending={deleteMutation.isPending}
          isError={deleteMutation.isError}
          onClose={() => setDeleteOpen(false)}
          onDelete={() => deleteMutation.mutate()}
        />
      </main>
    );
  }

  function saveTags() {
    if (tagsDraft === null) return;
    const tags = [...new Set(tagsDraft.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
    if (tags.length > 10 || tags.some((tag) => tag.length > 30)) {
      setTagError(t('tagsHint'));
      return;
    }
    tagsMutation.mutate(tags);
  }

  const queueError = queueMutation.isError ? t('queueError') : null;
  const currentWordQueued = Boolean(word.isQueued || queuedWordIds.has(word.id));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href={ROUTES.words} className={theme.linkMuted}>← {t('back')}</Link>
      <section className={cn(theme.surface, 'flex flex-col gap-6 p-6')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-display">{word.term}</h1>
            {content?.pronunciation ? <p className={cn('mt-2 mb-0', theme.muted)}>{content.pronunciation}</p> : null}
          </div>
          {word.status === 'SHADOW' ? <Badge variant="neutral">{t('statusShadow')}</Badge> : <WordHealthBadge level={toHealthLevel(word.health?.depthLevel)} />}
        </div>

        {word.status === 'SHADOW' ? (
          <div className={cn(theme.warnSurface, 'flex flex-wrap items-center justify-between gap-3')}>
            <span>{t('shadowNote')}</span>
            <Button type="button" size="sm" variant="secondary" disabled={currentWordQueued} isLoading={queueMutation.isPending && queueMutation.variables === word.id} onClick={() => queueMutation.mutate(word.id)}>
              {currentWordQueued ? t('addedToQueue') : t('addToQueue')}
            </Button>
          </div>
        ) : null}

        {definition ? (
          <section>
            <h2 className="text-title">{t('meaning')}</h2>
            <p className="mt-2 mb-0">{definition}</p>
          </section>
        ) : null}

        {content?.examples.length ? (
          <section>
            <h2 className="text-title">{t('examples')}</h2>
            <ul className="mb-0 grid gap-3 pl-5">
              {content.examples.map((example, index) => (
                <li key={`${example.sentence}-${index}`}>
                  <span className="italic">“{example.sentence}”</span>
                  {locale === 'vi' && example.translation_vi ? <span className={cn('mt-1 block text-sm', theme.muted)}>{example.translation_vi}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {word.health ? (
          <section>
            <h2 className="text-title">{t('health')}</h2>
            <p className={cn('mt-2 mb-0', theme.muted)}>{t('attempts', { count: word.health.totalAttempts, streak: word.health.currentStreak })}</p>
          </section>
        ) : null}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-title">{t('tags')}</h2>
            {tagsDraft === null ? <Button type="button" size="sm" variant="ghost" onClick={() => setTagsDraft(word.tags.join(', '))}>{t('editTags')}</Button> : null}
          </div>
          {tagsDraft === null ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {word.tags.length ? word.tags.map((tag) => <Badge key={tag}>{tag}</Badge>) : <span className={theme.muted}>—</span>}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <Input label={t('tagsLabel')} name="word-tags" value={tagsDraft} onChange={(event) => { setTagsDraft(event.target.value); setTagError(null); }} placeholder={t('tagsPlaceholder')} error={tagError ?? undefined} />
              <p className={cn('m-0 text-sm', theme.muted)}>{t('tagsHint')}</p>
              {tagsMutation.isError ? <p className={theme.errorSurface}>{t('saveError')}</p> : null}
              <div className="flex gap-3">
                <Button type="button" size="sm" isLoading={tagsMutation.isPending} onClick={saveTags}>{t('saveTags')}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setTagsDraft(null); setTagError(null); }}>{tCommon('cancel')}</Button>
              </div>
            </div>
          )}
        </section>

        {word.quizzes?.length ? (
          <section>
            <h2 className="text-title">{t('quizPool')}</h2>
            <p className={cn('mt-2 mb-0', theme.muted)}>{t('quizCount', { count: word.quizzes.length })}</p>
          </section>
        ) : null}

        {word.shadows?.length ? (
          <section>
            <h2 className="text-title">{t('related')}</h2>
            <ul className="mt-3 grid list-none gap-2 p-0">
              {word.shadows.map((shadow) => (
                <li key={shadow.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-bg-elevated px-3 py-2">
                  <Link href={ROUTES.wordDetail(shadow.id)} className={theme.link}>{shadow.term}</Link>
                  {shadow.status === 'SHADOW' || shadow.status === 'FAILED' ? (
                    <Button type="button" size="sm" variant="ghost" disabled={Boolean(shadow.isQueued || queuedWordIds.has(shadow.id))} isLoading={queueMutation.isPending && queueMutation.variables === shadow.id} onClick={() => queueMutation.mutate(shadow.id)}>
                      {shadow.isQueued || queuedWordIds.has(shadow.id) ? t('addedToQueue') : t('addToQueue')}
                    </Button>
                  ) : (
                    <WordDetailStatusBadge status={shadow.status} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {queueError ? <p className={theme.errorSurface} role="alert">{queueError}</p> : null}
      </section>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={() => setDeleteOpen(true)}>{t('delete')}</Button>
      </div>

      <DeleteWordModal
        open={deleteOpen}
        word={word.term}
        isPending={deleteMutation.isPending}
        isError={deleteMutation.isError}
        onClose={() => setDeleteOpen(false)}
        onDelete={() => deleteMutation.mutate()}
      />
    </main>
  );
}

interface DeleteWordModalProps {
  open: boolean;
  word: string;
  isPending: boolean;
  isError: boolean;
  onClose: () => void;
  onDelete: () => void;
}

function DeleteWordModal({
  open,
  word,
  isPending,
  isError,
  onClose,
  onDelete,
}: DeleteWordModalProps) {
  const t = useTranslations('words.detail');
  const tCommon = useTranslations('common');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('deleteTitle', { word })}
      closeLabel={tCommon('cancel')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button type="button" isLoading={isPending} onClick={onDelete}>{t('confirmDelete')}</Button>
        </>
      }
    >
      <p className="m-0">{t('deleteBody')}</p>
      {isError ? <p className={cn('mt-3', theme.errorSurface)}>{t('deleteError')}</p> : null}
    </Modal>
  );
}

function WordDetailStatusBadge({ status }: { status: WordDetail['status'] }) {
  const t = useTranslations('words.detail');
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
