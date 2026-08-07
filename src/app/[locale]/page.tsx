import { getTranslations } from 'next-intl/server';
import { Link } from '@/infrastructure/i18n/navigation';
import { AppInfoPanel } from '@/features/app/app-info-panel';
import { ApiHealthStatus } from '@/features/app/api-health-status';
import { ROUTES } from '@/common/constants/routes';
import { isAuthEnabled } from '@/config/features.config';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

export default async function HomePage() {
  const t = await getTranslations('app');

  return (
    <main className="flex flex-col gap-6">
      <AppInfoPanel />

      <section>
        <h2 className={cn('mb-2 text-base', theme.muted)}>{t('apiHealth')}</h2>
        <ApiHealthStatus />
      </section>

      <p className={theme.muted}>{t('subtitle')}</p>

      {isAuthEnabled() ? (
        <nav className="flex flex-wrap gap-4">
          <Link
            href={ROUTES.login}
            className={cn(
              'inline-block rounded-md px-4 py-2 no-underline hover:no-underline',
              theme.buttonPrimary,
            )}
          >
            {t('goToLogin')}
          </Link>
          <Link href={ROUTES.register} className={theme.navButtonSecondary}>
            {t('goToRegister')}
          </Link>
          <Link href={ROUTES.dashboard} className={theme.navButtonSecondary}>
            {t('dashboard')}
          </Link>
        </nav>
      ) : null}
    </main>
  );
}
