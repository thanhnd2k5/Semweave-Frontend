'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/infrastructure/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { LinearProgress } from '@/components/ui/LinearProgress';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QuizFeedback } from '@/components/ui/QuizFeedback';
import { ROUTES } from '@/common/constants/routes';
import { ApiError } from '@/common/errors/api-error';
import { translateApiError } from '@/common/errors/translate-api-error';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { ANONYMOUS_QUERY_IDENTITY } from '@/lib/private-query';
import { theme } from '@/lib/theme-classes';
import { cn } from '@/lib/cn';
import { invalidateLearningStats } from './learning-query-keys';
import { getSessionRepository } from './offline/session-repository';
import { processSyncOperation } from './offline/sync-worker';
import {
  advanceQuestion,
  bootstrapSession,
  canAbandonSession,
  pauseForegroundTimer,
  queueSessionFinalization,
  resumeForegroundTimer,
  submitAnswer,
  type SessionRuntime,
} from './session-runtime';
import { DoubleAnswerError } from './engine/session-machine';
import { ChoiceQuestion } from './choice-question';
import { FillInBlankQuestion } from './fill-in-blank-question';
import { SessionSummaryView } from './session-summary';
import { QUIZ_INSTRUCTION_KEYS } from './quiz-instructions';
import { accuracyPercent, formatDuration, formatRelativeDue } from './format-session';
import type { QuizType, SessionAttemptAnswer, SessionQuestion } from './types';

function instructionFor(t: ReturnType<typeof useTranslations<'quiz'>>, type: QuizType): string {
  return t(QUIZ_INSTRUCTION_KEYS[type]);
}

interface QuizSessionContentProps {
  sessionId: string;
}

function progressValue(runtime: SessionRuntime): number {
  const total = runtime.snapshot.bundle.totalQuestions || 1;
  return Math.round((runtime.machine.answeredQuestionIds.length / total) * 100);
}

function toAnswer(question: SessionQuestion, draft: string): SessionAttemptAnswer {
  if (question.type === 'FILL_IN_BLANK') {
    return { kind: 'TEXT', text: draft };
  }
  return { kind: 'OPTION', optionId: draft };
}

function selectedOptionId(runtime: SessionRuntime, question: SessionQuestion | undefined): string {
  if (!question || question.type === 'FILL_IN_BLANK') return '';
  const attempt = runtime.attempts.find((item) => item.sessionQuestionId === question.id);
  if (attempt?.answer.kind === 'OPTION') return attempt.answer.optionId;
  return runtime.machine.draft;
}

function useOnline(): boolean {
  const [online, setOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  );
  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine);
    }
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  return online;
}

export function QuizSessionContent({ sessionId }: QuizSessionContentProps) {
  const ownerId = useQueryIdentity();
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('quiz');
  const tErrors = useTranslations('errors');
  const repo = useMemo(() => getSessionRepository(), []);
  const online = useOnline();
  const [runtime, setRuntime] = useState<SessionRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const runtimeRef = useRef<SessionRuntime | null>(null);
  const busyRef = useRef(false);
  const completingRef = useRef(false);
  const pendingAbandonRef = useRef(false);
  const pendingSyncTriedRef = useRef(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const onFinalizeRef = useRef<(endpoint: 'COMPLETE' | 'ABANDON') => void>(() => undefined);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  useEffect(() => {
    if (ownerId === ANONYMOUS_QUERY_IDENTITY) return;
    let cancelled = false;
    void bootstrapSession(repo, ownerId, sessionId)
      .then((next) => {
        if (!cancelled) setRuntime(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          const apiError = ApiError.fromUnknown(cause);
          setError(translateApiError(tErrors, apiError.code, t('loadError')));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, repo, sessionId, t, tErrors]);

  const onSubmitAnswer = useCallback(
    async (draft: string) => {
      const current = runtimeRef.current;
      if (!current || busyRef.current) return;
      const question = current.snapshot.bundle.questions[current.machine.cursor];
      if (!question || current.machine.phase !== 'question') return;
      if (question.type === 'FILL_IN_BLANK' && draft.trim().length === 0) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const next = await submitAnswer(repo, current, toAnswer(question, draft));
        runtimeRef.current = next;
        setRuntime(next);
      } catch (cause) {
        if (!(cause instanceof DoubleAnswerError)) {
          setError(cause instanceof Error ? cause.message : t('saveError'));
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
        if (pendingAbandonRef.current) {
          pendingAbandonRef.current = false;
          onFinalizeRef.current('ABANDON');
        }
      }
    },
    [repo, t],
  );

  const onNext = useCallback(async () => {
    const current = runtimeRef.current;
    if (!current || busyRef.current || current.machine.phase !== 'feedback') return;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = await advanceQuestion(repo, current);
      runtimeRef.current = next;
      setRuntime(next);
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (pendingAbandonRef.current) {
        pendingAbandonRef.current = false;
        onFinalizeRef.current('ABANDON');
      }
    }
  }, [repo]);

  const refreshAfterSync = useCallback(async () => {
    const snapshot = await repo.loadSnapshot(ownerId, sessionId);
    const current = runtimeRef.current;
    if (!snapshot || !current) return;
    const operation = await repo.loadSyncOperation(ownerId, sessionId);
    setSyncFailed(operation?.status === 'FAILED' || operation?.status === 'CONFLICT');
    setRuntime({
      ...current,
      snapshot,
      machine: {
        ...current.machine,
        phase: 'summary',
        currentFeedback: null,
        draft: '',
      },
    });
    void invalidateLearningStats(queryClient, ownerId);
  }, [ownerId, queryClient, repo, sessionId]);

  const onFinalize = useCallback(
    async (endpoint: 'COMPLETE' | 'ABANDON') => {
      const current = runtimeRef.current;
      if (!current) return;
      if (endpoint === 'ABANDON') {
        if (
          !canAbandonSession({
            localStatus: current.snapshot.localStatus,
            phase: current.machine.phase,
            completing: completingRef.current,
          })
        ) {
          void invalidateLearningStats(queryClient, ownerId);
          router.replace(ROUTES.dashboard);
          return;
        }
        if (busyRef.current) {
          pendingAbandonRef.current = true;
          return;
        }
      } else if (busyRef.current) {
        return;
      }
      busyRef.current = true;
      completingRef.current = true;
      setBusy(true);
      try {
        await queueSessionFinalization(repo, current, endpoint);
        completingRef.current = true;
        pendingSyncTriedRef.current = true;
        const canSyncNow = typeof navigator === 'undefined' || navigator.onLine;
        if (canSyncNow) {
          await processSyncOperation(ownerId, sessionId, { repo });
        }
        if (endpoint === 'ABANDON') {
          void invalidateLearningStats(queryClient, ownerId);
          router.replace(ROUTES.dashboard);
          return;
        }
        await refreshAfterSync();
      } catch (cause) {
        completingRef.current = false;
        const apiError = ApiError.fromUnknown(cause);
        setError(translateApiError(tErrors, apiError.code, t('finishError')));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [ownerId, queryClient, refreshAfterSync, repo, router, sessionId, t, tErrors],
  );
  onFinalizeRef.current = onFinalize;

  const onRetrySync = useCallback(async () => {
    pendingSyncTriedRef.current = true;
    busyRef.current = true;
    setBusy(true);
    try {
      await processSyncOperation(ownerId, sessionId, { repo });
      await refreshAfterSync();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [ownerId, refreshAfterSync, repo, sessionId]);

  useEffect(() => {
    if (!runtime) return;
    if (runtime.machine.phase !== 'summary') return;
    if (runtime.snapshot.localStatus !== 'IN_PROGRESS') return;
    if (completingRef.current || busy) return;
    void onFinalize('COMPLETE');
  }, [busy, onFinalize, runtime]);

  useEffect(() => {
    if (!runtime?.snapshot.localStatus.startsWith('PENDING')) return;
    if (pendingSyncTriedRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    pendingSyncTriedRef.current = true;
    void processSyncOperation(ownerId, sessionId, { repo }).then(() => refreshAfterSync());
  }, [ownerId, refreshAfterSync, repo, runtime?.snapshot.localStatus, sessionId]);

  useEffect(() => {
    function onOnline() {
      void processSyncOperation(ownerId, sessionId, { repo }).then(() => refreshAfterSync());
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [ownerId, refreshAfterSync, repo, sessionId]);

  useEffect(() => {
    if (runtime?.machine.phase !== 'feedback') return;
    nextButtonRef.current?.focus();
  }, [runtime?.machine.phase, runtime?.machine.cursor]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        void onFinalize('ABANDON');
        return;
      }
      const current = runtimeRef.current;
      if (!current || current.machine.phase !== 'feedback') return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target;
      if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) return;
      event.preventDefault();
      void onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinalize, onNext]);

  useEffect(() => {
    function persist(next: SessionRuntime) {
      if (runtimeRef.current?.snapshot.sessionId === next.snapshot.sessionId) {
        runtimeRef.current = next;
        setRuntime(next);
      }
    }
    function pause() {
      const current = runtimeRef.current;
      if (!current) return;
      void pauseForegroundTimer(repo, current).then(persist);
    }
    function resume() {
      const current = runtimeRef.current;
      if (!current) return;
      void resumeForegroundTimer(repo, current).then(persist);
    }
    function onVisibility() {
      if (document.hidden) pause();
      else resume();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
    };
  }, [repo]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-4 py-8">
        <p className={theme.errorText}>{error}</p>
        <Button type="button" variant="secondary" onClick={() => router.replace(ROUTES.dashboard)}>
          {t('home')}
        </Button>
      </main>
    );
  }

  if (!runtime) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label={t('loading')} />
      </div>
    );
  }

  const question = runtime.snapshot.bundle.questions[runtime.machine.cursor];
  const pending = runtime.snapshot.localStatus.startsWith('PENDING');
  const synced = runtime.snapshot.localStatus.startsWith('SYNCED');
  const showSummary = runtime.machine.phase === 'summary' || pending || synced;
  const canonical = runtime.snapshot.canonicalSummary ?? null;
  const localCorrect = runtime.attempts.filter((attempt) => attempt.localGrade.isCorrect).length;
  const totalQuestions = runtime.snapshot.bundle.totalQuestions;
  const answeredCount = runtime.machine.answeredQuestionIds.length;
  const isLast = answeredCount >= totalQuestions;
  const elapsedMs = canonical?.durationMs ?? runtime.snapshot.timer.sessionElapsedMs ?? 0;
  const trialWordId = runtime.snapshot.bundle.questions[0]?.word.id;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-bg-base py-4">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 min-w-11 px-0"
          onClick={() => void onFinalize('ABANDON')}
          aria-label={t('exit')}
        >
          ✕
        </Button>
        <LinearProgress
          value={progressValue(runtime)}
          size="sm"
          label={t('progress', { current: answeredCount, total: totalQuestions })}
          className="flex-1"
        />
        <span className={cn('shrink-0 text-sm tabular-nums', theme.muted)}>
          {answeredCount}/{totalQuestions}
        </span>
      </header>

      {!online ? (
        <p className={cn('m-0', theme.warnSurface)} role="status">
          {t('offlineBanner')}
        </p>
      ) : null}

      {showSummary ? (
        <SessionSummaryView
          canonical={canonical}
          sessionType={runtime.snapshot.bundle.type}
          syncPending={pending && !canonical}
          syncFailed={syncFailed}
          title={t('completed')}
          statsLine={t('stats', {
            words: canonical?.totalWords ?? runtime.snapshot.bundle.totalWords,
            percent: accuracyPercent(localCorrect, totalQuestions, canonical?.accuracy),
            duration: formatDuration(elapsedMs, locale),
          })}
          pendingHint={t('pendingSync')}
          failedHint={t('syncFailed')}
          improvedLabel={t('improved')}
          reviewLabel={t('review')}
          leveledUpLabel={t('leveledUp')}
          nextDueLabel={
            canonical?.nextDueAt
              ? t('nextDue', { time: formatRelativeDue(canonical.nextDueAt, locale) })
              : ''
          }
          homeLabel={t('home')}
          addWordLabel={t('addWord')}
          viewWordLabel={t('viewWord')}
          retryLabel={t('retrySync')}
          onHome={() => router.replace(ROUTES.dashboard)}
          onAddWord={() => router.replace(ROUTES.wordsNew)}
          onViewWord={
            trialWordId ? () => router.replace(ROUTES.wordDetail(trialWordId)) : undefined
          }
          onRetry={syncFailed ? () => void onRetrySync() : undefined}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {runtime.machine.phase === 'question' && question ? (
            question.type === 'FILL_IN_BLANK' ? (
              <FillInBlankQuestion
                key={question.id}
                prompt={question.question}
                instruction={instructionFor(t, question.type)}
                value={runtime.machine.draft}
                onChange={(value) =>
                  setRuntime({
                    ...runtime,
                    machine: { ...runtime.machine, draft: value },
                  })
                }
                onSubmit={() => void onSubmitAnswer(runtime.machine.draft)}
                submitLabel={t('check')}
                placeholder={t('placeholder')}
                inputLabel={t('inputLabel')}
                disabled={busy}
              />
            ) : (
              <ChoiceQuestion
                key={question.id}
                prompt={question.question}
                instruction={instructionFor(t, question.type)}
                options={question.options}
                value={selectedOptionId(runtime, question)}
                onChange={(optionId) => void onSubmitAnswer(optionId)}
                quizType={question.type}
                disabled={busy}
              />
            )
          ) : null}

          {runtime.machine.phase === 'feedback' && question ? (
            <>
              {question.type !== 'FILL_IN_BLANK' ? (
                <ChoiceQuestion
                  prompt={question.question}
                  instruction={instructionFor(t, question.type)}
                  options={question.options}
                  value={selectedOptionId(runtime, question)}
                  onChange={() => undefined}
                  quizType={question.type}
                  disabled
                />
              ) : (
                <section className="flex flex-col gap-5">
                  <p className={cn('m-0 text-sm', theme.muted)}>
                    {instructionFor(t, question.type)}
                  </p>
                  <p className="m-0 max-w-[65ch] text-base leading-relaxed">{question.question}</p>
                </section>
              )}
              <QuizFeedback
                isCorrect={Boolean(runtime.machine.currentFeedback?.isCorrect)}
                title={
                  runtime.machine.currentFeedback?.isCorrect ? t('correct') : t('incorrectLead')
                }
                explanation={question.explanation}
                correctAnswer={
                  runtime.machine.currentFeedback?.isCorrect ? undefined : question.correctAnswer
                }
              />
              <div className="flex justify-end">
                <Button
                  ref={nextButtonRef}
                  type="button"
                  onClick={() => void onNext()}
                  disabled={busy}
                >
                  {isLast ? t('seeResults') : t('next')}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </main>
  );
}
