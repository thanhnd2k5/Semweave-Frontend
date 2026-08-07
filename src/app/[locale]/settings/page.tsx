import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { SettingsContent } from '@/features/settings/settings-content';
import { isAuthEnabled } from '@/config/features.config';

export default function SettingsPage() {
  const content = (
    <main className="flex flex-col gap-6">
      <SettingsContent />
    </main>
  );

  if (isAuthEnabled()) {
    return <AuthGuard>{content}</AuthGuard>;
  }

  return content;
}
