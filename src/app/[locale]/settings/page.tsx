import { getTranslations } from 'next-intl/server';
import { AuthGuard } from '@/features/_optional/auth/auth-guard';
import { ThemeToggle } from '@/features/theme/theme-toggle';
import { isAuthEnabled } from '@/config/features.config';
import { theme } from '@/lib/theme-classes';

export default async function SettingsPage() {
  const t = await getTranslations('settings');

  const content = (
    <main className="flex flex-col gap-6">
      <h1>{t('title')}</h1>
      <ThemeToggle />
      <p className={theme.muted}>{t('placeholder')}</p>
    </main>
  );

  if (isAuthEnabled()) {
    return <AuthGuard>{content}</AuthGuard>;
  }

  return content;
}
