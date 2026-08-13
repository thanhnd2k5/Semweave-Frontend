import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { isAuthEnabled } from '@/config/features.config';
import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { QueueContent } from '@/features/queue/queue-content';

export default function QueuePage() {
  const content = (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <QueueContent />
    </Suspense>
  );

  return isAuthEnabled() ? <AuthGuard>{content}</AuthGuard> : content;
}
