'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/common/errors/api-error';
import { translateApiError } from '@/common/errors/translate-api-error';
import { ROUTES } from '@/common/constants/routes';
import { useQueryIdentity } from '@/hooks/use-query-identity';
import { useRouter } from '@/infrastructure/i18n/navigation';
import { createAndCacheSession } from './session-runtime';
import { getSessionRepository } from './offline/session-repository';

export function useStartStudySession() {
  const ownerId = useQueryIdentity();
  const router = useRouter();
  const tErrors = useTranslations('errors');
  const tQuiz = useTranslations('quiz');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(input: { type: 'DUE_TODAY' } | { type: 'WORD_TRIAL'; wordId: string }) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const runtime = await createAndCacheSession(getSessionRepository(), ownerId, input);
      router.push(ROUTES.study(runtime.snapshot.sessionId));
    } catch (cause) {
      const apiError = ApiError.fromUnknown(cause);
      setError(translateApiError(tErrors, apiError.code, tQuiz('startError')));
    } finally {
      setPending(false);
    }
  }

  return {
    startDueToday: () => start({ type: 'DUE_TODAY' }),
    startWordTrial: (wordId: string) => start({ type: 'WORD_TRIAL', wordId }),
    pending,
    error,
  };
}
