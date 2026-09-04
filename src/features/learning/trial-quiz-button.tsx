'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme-classes';
import { canStartWordTrial } from './quiz-instructions';
import { useStartWordTrial } from './use-start-word-trial';

interface TrialQuizButtonProps {
  wordId: string;
  quizCount: number | undefined;
  label: string;
  unavailable: string;
  size?: 'md' | 'lg';
  className?: string;
  autoFocus?: boolean;
}

export function TrialQuizButton({
  wordId,
  quizCount,
  label,
  unavailable,
  size = 'md',
  className,
  autoFocus,
}: TrialQuizButtonProps) {
  const { start, pending, error } = useStartWordTrial();
  const enabled = canStartWordTrial(quizCount);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocus && enabled) {
      buttonRef.current?.focus();
    }
  }, [autoFocus, enabled]);

  return (
    <div className={className}>
      <Button
        ref={buttonRef}
        type="button"
        variant="secondary"
        size={size}
        disabled={!enabled || pending}
        isLoading={pending}
        title={enabled ? undefined : unavailable}
        onClick={() => void start(wordId)}
      >
        {label}
      </Button>
      {error ? <p className={`mt-2 mb-0 ${theme.errorSurface}`}>{error}</p> : null}
    </div>
  );
}
