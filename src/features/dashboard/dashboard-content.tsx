'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/infrastructure/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/common/constants/routes';
import { useAuth } from '@/features/_optional/auth/use-auth';
import { theme } from '@/lib/theme-classes';
import { BatchProgressBanner } from './batch-progress-banner';

export function DashboardContent() {
  const t = useTranslations('dashboard');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <BatchProgressBanner />
      <h1>{t('title')}</h1>
      {user ? <p>{t('welcome', { email: user.email })}</p> : null}
      <p className={theme.muted}>{t('placeholder')}</p>

      <nav className="flex flex-wrap items-center gap-4">
        {isAuthenticated ? (
          <Button variant="secondary" onClick={() => void logout()}>
            {tAuth('logout')}
          </Button>
        ) : null}
        <Link href={ROUTES.settings} className={theme.linkMuted}>
          {t('settings')}
        </Link>
        <Link href={ROUTES.wordsNew} className={theme.link}>
          {t('addWord')}
        </Link>
        <Link href={ROUTES.words} className={theme.link}>
          {t('wordLibrary')}
        </Link>
        <Link href={ROUTES.queue} className={theme.link}>
          {t('queue')}
        </Link>
      </nav>

      <Link href={ROUTES.home} className={`mt-6 ${theme.linkMuted}`}>
        ← {tCommon('back')}
      </Link>
    </main>
  );
}
