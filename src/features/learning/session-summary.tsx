'use client';

import { WordHealthBadge } from '@/components/ui/WordHealthBadge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';
import { toHealthLevel } from '@/features/words/types';
import type { SessionSummary as SessionSummaryDto, StudySessionType } from './types';

interface SessionSummaryProps {
  canonical?: SessionSummaryDto | null;
  sessionType: StudySessionType;
  syncPending: boolean;
  syncFailed: boolean;
  title: string;
  statsLine: string;
  pendingHint: string;
  failedHint: string;
  improvedLabel: string;
  reviewLabel: string;
  nextDueLabel: string;
  homeLabel: string;
  addWordLabel: string;
  viewWordLabel: string;
  retryLabel: string;
  onHome: () => void;
  onAddWord: () => void;
  onViewWord?: () => void;
  onRetry?: () => void;
}

function WordList({
  label,
  words,
  direction,
}: {
  label: string;
  words: SessionSummaryDto['improvedWords'];
  direction: 'up' | 'down';
}) {
  if (!words.length) return null;
  return (
    <div>
      <p className={cn('m-0 mb-2 text-sm font-medium', theme.muted)}>{label}</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {words.map((word) => (
          <li key={word.wordId} className="flex items-center gap-2 rounded-md bg-bg-elevated px-2 py-1">
            <span>{word.term}</span>
            <span
              className={direction === 'up' ? theme.successText : theme.errorText}
              aria-hidden
            >
              {direction === 'up' ? '↑' : '↓'}
            </span>
            <WordHealthBadge level={toHealthLevel(word.levelAfter)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SessionSummaryView({
  canonical,
  sessionType,
  syncPending,
  syncFailed,
  title,
  statsLine,
  pendingHint,
  failedHint,
  improvedLabel,
  reviewLabel,
  nextDueLabel,
  homeLabel,
  addWordLabel,
  viewWordLabel,
  retryLabel,
  onHome,
  onAddWord,
  onViewWord,
  onRetry,
}: SessionSummaryProps) {
  return (
    <section className={cn(theme.surface, 'mx-auto flex w-full max-w-lg flex-col gap-5 p-6')}>
      <h1 className="m-0 text-title">{title}</h1>
      <p className="m-0">{statsLine}</p>
      {canonical ? (
        <>
          <WordList label={improvedLabel} words={canonical.improvedWords} direction="up" />
          <WordList label={reviewLabel} words={canonical.reviewWords} direction="down" />
          {canonical.nextDueAt ? (
            <p className={cn('m-0 text-sm', theme.muted)}>{nextDueLabel}</p>
          ) : null}
        </>
      ) : null}
      {syncFailed ? (
        <p className={cn('m-0 text-sm', theme.errorText)} role="alert">
          {failedHint}
        </p>
      ) : syncPending ? (
        <p className={cn('m-0 text-sm', theme.muted)}>{pendingHint}</p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onAddWord}>
          {addWordLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onHome}>
          {homeLabel}
        </Button>
        {sessionType === 'WORD_TRIAL' && onViewWord ? (
          <Button type="button" variant="ghost" onClick={onViewWord}>
            {viewWordLabel}
          </Button>
        ) : null}
        {onRetry ? (
          <Button type="button" variant="ghost" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
