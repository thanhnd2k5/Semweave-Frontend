import { Suspense } from 'react';
import { isAuthEnabled } from '@/config/features.config';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { WordListContent } from '@/features/words/word-list-content';

export default function WordsPage() {
  const content = (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <WordListContent />
    </Suspense>
  );

  return isAuthEnabled() ? <AuthGuard>{content}</AuthGuard> : content;
}
