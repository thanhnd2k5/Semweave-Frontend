'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ApiError } from '@/common/errors/api-error';
import { ErrorCodes } from '@/common/constants/error-codes';
import { translateApiError } from '@/common/errors/translate-api-error';
import { ROUTES } from '@/common/constants/routes';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Radio, RadioGroup } from '@/components/ui/RadioGroup';
import { WordHealthBadge } from '@/components/ui/WordHealthBadge';
import { Link } from '@/infrastructure/i18n/navigation';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';
import {
  checkDuplicate,
  createWord,
  detectAmbiguity,
  getWord,
  regenerateWord,
  retryWord,
} from './api';
import {
  getWordContent,
  toHealthLevel,
  type AmbiguityResult,
  type WordDetail,
} from './types';

type View =
  | { kind: 'editing' }
  | { kind: 'checking'; label: 'duplicate' | 'ambiguity' | 'create' | 'regenerate' }
  | { kind: 'duplicate'; word: WordDetail }
  | {
      kind: 'clarifying';
      ambiguity: AmbiguityResult;
      selectedSense: number | null;
      customContext: string;
    }
  | { kind: 'generating'; wordId: string }
  | { kind: 'failed'; word: WordDetail }
  | { kind: 'limit'; limit: number }
  | { kind: 'preview'; word: WordDetail }
  | { kind: 'requestError'; message: string };

function getDailyLimit(error: ApiError): number {
  const limit = error.details?.limit;
  return typeof limit === 'number' && Number.isFinite(limit) ? limit : 3;
}

function getContext(ambiguity: AmbiguityResult, selectedSense: number | null, customContext: string) {
  const typedContext = customContext.trim();
  if (typedContext) return typedContext;

  const sense = selectedSense === null ? undefined : ambiguity.senses?.[selectedSense];
  return sense ? `${sense.label}: ${sense.description}` : undefined;
}

export function AddWordContent() {
  const t = useTranslations('words');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [term, setTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'editing' });

  const pollWordId = view.kind === 'generating' ? view.wordId : null;
  const wordQuery = useQuery({
    queryKey: ['words', 'detail', pollWordId],
    queryFn: () => getWord(pollWordId as string),
    enabled: pollWordId !== null,
    retry: 1,
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 1000 : false,
  });

  let displayView = view;
  if (view.kind === 'generating') {
    if (wordQuery.data?.status === 'OFFICIAL' || wordQuery.data?.status === 'GRADUATED') {
      displayView = { kind: 'preview', word: wordQuery.data };
    } else if (wordQuery.data?.status === 'FAILED') {
      displayView = { kind: 'failed', word: wordQuery.data };
    } else if (wordQuery.isError) {
      const error = ApiError.fromUnknown(wordQuery.error);
      displayView = {
        kind: 'requestError',
        message: translateApiError(tErrors, error.code, t('requestError')),
      };
    }
  }

  const previewWordId = displayView.kind === 'preview' ? displayView.word.id : null;

  useEffect(() => {
    if (previewWordId) {
      previewHeadingRef.current?.focus();
    }
  }, [previewWordId]);

  function resetToEditing() {
    setValidationError(null);
    setView({ kind: 'editing' });
  }

  function startPolling(wordId: string) {
    queryClient.removeQueries({ queryKey: ['words', 'detail', wordId] });
    setView({ kind: 'generating', wordId });
  }

  async function showDuplicateFromError(error: ApiError): Promise<boolean> {
    const wordId = error.details?.wordId;
    if (typeof wordId !== 'string') return false;

    try {
      const word = await getWord(wordId);
      setView({ kind: 'duplicate', word });
      return true;
    } catch {
      return false;
    }
  }

  function showRequestError(error: unknown) {
    const apiError = ApiError.fromUnknown(error);
    setView({
      kind: 'requestError',
      message: translateApiError(tErrors, apiError.code, t('requestError')),
    });
  }

  async function createForTerm(context?: string) {
    const normalizedTerm = term.trim();
    setView({ kind: 'checking', label: 'create' });

    try {
      const result = await createWord(normalizedTerm, context);
      startPolling(result.wordId);
    } catch (error) {
      const apiError = ApiError.fromUnknown(error);
      if (apiError.code === ErrorCodes.DAILY_LIMIT_EXCEEDED) {
        setView({ kind: 'limit', limit: getDailyLimit(apiError) });
        return;
      }
      if (apiError.code === ErrorCodes.WORD_ALREADY_EXISTS && (await showDuplicateFromError(apiError))) {
        return;
      }
      showRequestError(apiError);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTerm = term.trim();

    if (!normalizedTerm) {
      setValidationError(t('validation.empty'));
      return;
    }
    if (normalizedTerm.length > 100) {
      setValidationError(t('validation.tooLong'));
      return;
    }

    setValidationError(null);
    setView({ kind: 'checking', label: 'duplicate' });

    try {
      const duplicate = await checkDuplicate(normalizedTerm);
      if (duplicate.exists) {
        setView({ kind: 'duplicate', word: duplicate.word });
        return;
      }

      setView({ kind: 'checking', label: 'ambiguity' });
      const ambiguity = await detectAmbiguity(normalizedTerm);
      if (ambiguity.ambiguous && ambiguity.senses?.length) {
        setView({
          kind: 'clarifying',
          ambiguity,
          selectedSense: null,
          customContext: '',
        });
        return;
      }

      await createForTerm();
    } catch (error) {
      showRequestError(error);
    }
  }

  async function handleClarificationContinue() {
    if (view.kind !== 'clarifying') return;
    const context = getContext(view.ambiguity, view.selectedSense, view.customContext);
    if (!context) {
      setValidationError(t('validation.contextRequired'));
      return;
    }
    setValidationError(null);
    await createForTerm(context);
  }

  async function handleRetry(wordId: string) {
    setView({ kind: 'checking', label: 'create' });
    try {
      const result = await retryWord(wordId);
      startPolling(result.wordId);
    } catch (error) {
      showRequestError(error);
    }
  }

  async function handleRegenerate(wordId: string) {
    setView({ kind: 'checking', label: 'regenerate' });
    try {
      const result = await regenerateWord(wordId);
      startPolling(result.wordId);
    } catch (error) {
      showRequestError(error);
    }
  }

  function reviewExistingWord(word: WordDetail) {
    if (word.status === 'PENDING') {
      startPolling(word.id);
      return;
    }
    if (word.status === 'FAILED') {
      setView({ kind: 'failed', word });
      return;
    }
    setView({ kind: 'preview', word });
  }

  if (displayView.kind === 'generating') {
    return <GeneratingState term={term.trim()} />;
  }

  if (displayView.kind === 'failed') {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <section className={theme.errorSurface} role="alert">
          <h1 className="m-0 text-title">{t('failed.title')}</h1>
          <p className="mt-2 mb-0">{t('failed.body', { word: displayView.word.term })}</p>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="lg" onClick={() => void handleRetry(displayView.word.id)}>
            {t('failed.retry')}
          </Button>
          <Link href={ROUTES.dashboard} className={theme.linkMuted}>
            {t('limit.backToDashboard')}
          </Link>
        </div>
      </main>
    );
  }

  if (displayView.kind === 'limit') {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <section className="rounded-md bg-warm/15 px-4 py-3 text-sm text-warm" role="status">
          {t('limit.body', { limit: displayView.limit })}
        </section>
        <Link href={ROUTES.dashboard} className={theme.link}>
          {t('limit.backToDashboard')}
        </Link>
      </main>
    );
  }

  if (displayView.kind === 'preview') {
    return <PreviewState word={displayView.word} locale={locale} headingRef={previewHeadingRef} />;
  }

  const isChecking = displayView.kind === 'checking';
  const checkingLabel = isChecking ? t('checking') : t('add');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-display">{t('title')}</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input
          label={t('inputLabel')}
          name="term"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setValidationError(null);
            if (displayView.kind === 'requestError') resetToEditing();
          }}
          placeholder={t('placeholder')}
          autoFocus
          autoComplete="off"
          spellCheck="false"
          error={validationError ?? undefined}
          disabled={isChecking}
          className="text-word"
        />
        {displayView.kind === 'requestError' ? (
          <p className={cn('m-0', theme.errorSurface)} role="alert">
            {displayView.message}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full sm:w-fit sm:self-end"
          isLoading={isChecking}
          disabled={!term.trim() || isChecking}
        >
          {checkingLabel}
        </Button>
      </form>

      {displayView.kind === 'duplicate' ? (
        <DuplicateModal
          word={displayView.word}
          onClose={resetToEditing}
          onReview={() => reviewExistingWord(displayView.word)}
          onRegenerate={() => void handleRegenerate(displayView.word.id)}
        />
      ) : null}

      {displayView.kind === 'clarifying' ? (
        <ClarificationModal
          ambiguity={displayView.ambiguity}
          selectedSense={displayView.selectedSense}
          customContext={displayView.customContext}
          onClose={resetToEditing}
          onSelectSense={(selectedSense) => {
            setValidationError(null);
            setView((current) =>
              current.kind === 'clarifying'
                ? { ...current, selectedSense, customContext: '' }
                : current,
            );
          }}
          onChangeContext={(customContext) => {
            setValidationError(null);
            setView((current) =>
              current.kind === 'clarifying'
                ? { ...current, customContext, selectedSense: null }
                : current,
            );
          }}
          onContinue={() => void handleClarificationContinue()}
        />
      ) : null}
    </main>
  );
}

function GeneratingState({ term }: { term: string }) {
  const t = useTranslations('words');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6" aria-live="polite">
      <section className={cn(theme.surface, 'flex flex-col items-start gap-5 p-6')}>
        <LoadingSpinner size="lg" label={t('generating.status', { word: term })} />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-title">{t('generating.title', { word: term })}</h1>
          <p className={cn('m-0', theme.muted)}>{t('generating.detail')}</p>
          <p className={cn('m-0 text-sm', theme.muted)}>{t('generating.typicalDuration')}</p>
        </div>
      </section>
    </main>
  );
}

function DuplicateModal({
  word,
  onClose,
  onReview,
  onRegenerate,
}: {
  word: WordDetail;
  onClose: () => void;
  onReview: () => void;
  onRegenerate: () => void;
}) {
  const t = useTranslations('words');
  const health = word.health;
  const level = toHealthLevel(health?.depthLevel);

  return (
    <Modal
      open
      onClose={onClose}
      title={t('duplicate.title', { word: word.term })}
      closeLabel={t('closeDialog')}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('duplicate.skip')}
          </Button>
          <Button type="button" variant="secondary" onClick={onRegenerate}>
            {t('duplicate.regenerate')}
          </Button>
          <Button type="button" onClick={onReview}>
            {t('duplicate.review')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <WordHealthBadge level={level} ariaLabel={t('duplicate.health', { level })} />
          <span className={cn('text-sm', theme.muted)}>
            {t('duplicate.reviewed', {
              count: health?.totalAttempts ?? 0,
              streak: health?.currentStreak ?? 0,
            })}
          </span>
        </div>
        <p className="m-0">{t('duplicate.question')}</p>
      </div>
    </Modal>
  );
}

function ClarificationModal({
  ambiguity,
  selectedSense,
  customContext,
  onClose,
  onSelectSense,
  onChangeContext,
  onContinue,
}: {
  ambiguity: AmbiguityResult;
  selectedSense: number | null;
  customContext: string;
  onClose: () => void;
  onSelectSense: (index: number) => void;
  onChangeContext: (value: string) => void;
  onContinue: () => void;
}) {
  const t = useTranslations('words');
  const titleId = 'word-clarification-title';
  const canContinue = selectedSense !== null || customContext.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={ambiguity.question ?? t('title')}
      titleId={titleId}
      closeLabel={t('closeDialog')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('ambiguity.cancel')}
          </Button>
          <Button type="button" onClick={onContinue} disabled={!canContinue}>
            {t('ambiguity.continue')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <RadioGroup
          name="word-sense"
          value={selectedSense === null ? '' : String(selectedSense)}
          onChange={(value) => onSelectSense(Number(value))}
          labelledBy={titleId}
        >
          {ambiguity.senses?.slice(0, 5).map((sense, index) => (
            <Radio key={`${sense.label}-${index}`} value={String(index)}>
              <span className="font-medium">{sense.label}</span>
              <span className={cn('ml-1', theme.muted)}>{sense.description}</span>
            </Radio>
          ))}
        </RadioGroup>
        <div className={cn('border-t pt-4', theme.headerBorder)}>
          <Input
            label={t('ambiguity.customContext')}
            name="word-context"
            value={customContext}
            onChange={(event) => onChangeContext(event.target.value)}
            placeholder={t('ambiguity.customPlaceholder')}
            maxLength={500}
          />
        </div>
      </div>
    </Modal>
  );
}

function PreviewState({
  word,
  locale,
  headingRef,
}: {
  word: WordDetail;
  locale: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const t = useTranslations('words');
  const content = getWordContent(word.content);
  const example = content?.examples[0];
  const definition = locale === 'vi' ? content?.definition_vi : content?.definition_en;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <section className={cn(theme.surface, 'flex flex-col gap-5 p-6')}>
        <h1 ref={headingRef} tabIndex={-1} className="m-0 text-title outline-none">
          {t('preview.title', { word: word.term })}
        </h1>
        {content?.pronunciation ? <p className={cn('m-0', theme.muted)}>{content.pronunciation}</p> : null}
        {definition ? (
          <div className="flex flex-col gap-1">
            <p className={cn('m-0 text-sm font-medium', theme.muted)}>{t('preview.meaning')}</p>
            <p className="m-0">{definition}</p>
          </div>
        ) : (
          <p className={cn('m-0', theme.muted)}>{t('preview.missingContent')}</p>
        )}
        {example ? (
          <div className="flex flex-col gap-1">
            <p className={cn('m-0 text-sm font-medium', theme.muted)}>{t('preview.example')}</p>
            <p className="m-0 italic">“{example.sentence}”</p>
            {locale === 'vi' && example.translation_vi ? (
              <p className={cn('m-0 text-sm', theme.muted)}>{example.translation_vi}</p>
            ) : null}
          </div>
        ) : null}
        {word.shadows?.length ? (
          <div className="flex flex-col gap-2">
            <p className={cn('m-0 text-sm font-medium', theme.muted)}>{t('preview.related')}</p>
            <div className="flex flex-wrap gap-2">
              {word.shadows.map((shadow) => (
                <Badge key={shadow.id} variant="neutral">
                  {shadow.term}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" size="lg" disabled>
          {t('preview.quizSoon')}
        </Button>
        <Link href={ROUTES.dashboard} className={theme.linkMuted}>
          {t('preview.backToDashboard')}
        </Link>
      </div>
    </main>
  );
}
