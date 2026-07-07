'use client';

import { useTranslations } from 'next-intl';
import { useApiHealth } from '@/hooks/use-api-health';
import { clientEnv } from '@/config/env.client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

export function ApiHealthStatus() {
  const t = useTranslations('app');
  const { data, isLoading, isError } = useApiHealth();

  if (!clientEnv.apiUrl && !clientEnv.featureApiProxy) {
    return (
      <p className={cn('m-0', theme.muted)}>
        Set <code className={theme.code}>NEXT_PUBLIC_API_URL</code> to check API health.
      </p>
    );
  }

  if (isLoading) {
    return <LoadingSpinner size="sm" label={t('apiHealth')} />;
  }

  if (isError || !data) {
    return <p className={cn('m-0', theme.errorText)}>{t('apiUnreachable')}</p>;
  }

  return (
    <div className={cn('m-0 flex items-center gap-2', theme.successText)}>
      <span className={theme.successDot} aria-hidden />
      <span>
        {t('apiHealthy')}: <strong>{data.name}</strong> v{data.version}
      </span>
    </div>
  );
}
