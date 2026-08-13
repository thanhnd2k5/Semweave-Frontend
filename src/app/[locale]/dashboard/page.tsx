import { Suspense } from 'react';
import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { DashboardContent } from '@/features/dashboard/dashboard-content';
import { isAuthEnabled } from '@/config/features.config';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const content = (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <DashboardContent />
    </Suspense>
  );

  if (isAuthEnabled()) {
    return <AuthGuard>{content}</AuthGuard>;
  }

  return content;
}
