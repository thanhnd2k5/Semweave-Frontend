'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/infrastructure/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/common/constants/routes';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-col gap-4 py-8 text-center">
      <h1>{t('errorTitle')}</h1>
      <p className={cn('m-0', theme.muted)}>{t('error')}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        <Button type="button" onClick={reset}>
          {t('tryAgain')}
        </Button>
        <Link href={ROUTES.home} className={cn('inline-flex items-center', theme.linkMuted)}>
          {t('back')}
        </Link>
      </div>
    </main>
  );
}
