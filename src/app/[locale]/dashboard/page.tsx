import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { DashboardContent } from '@/features/dashboard/dashboard-content';
import { isAuthEnabled } from '@/config/features.config';

export default function DashboardPage() {
  if (isAuthEnabled()) {
    return (
      <AuthGuard>
        <DashboardContent />
      </AuthGuard>
    );
  }

  return <DashboardContent />;
}
