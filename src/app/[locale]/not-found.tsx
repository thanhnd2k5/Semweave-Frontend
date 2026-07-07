import { getTranslations } from 'next-intl/server';
import { Link } from '@/infrastructure/i18n/navigation';
import { ROUTES } from '@/common/constants/routes';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

export default async function NotFoundPage() {
  const t = await getTranslations('common');

  return (
    <main className="flex flex-col items-center gap-4 py-8 text-center">
      <p className={cn('m-0 text-5xl font-bold', theme.muted)}>404</p>
      <h1>{t('notFound')}</h1>
      <Link href={ROUTES.home} className={theme.link}>
        {t('back')}
      </Link>
    </main>
  );
}
