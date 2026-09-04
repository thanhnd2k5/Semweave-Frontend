'use client';

import { useStartStudySession } from './use-start-study-session';

export function useStartWordTrial() {
  const { startWordTrial, pending, error } = useStartStudySession();
  return { start: startWordTrial, pending, error };
}
