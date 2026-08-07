'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { usePathname, useRouter } from '@/infrastructure/i18n/navigation';
import type { Locale } from '@/infrastructure/i18n/routing';
import { cn } from '@/lib/cn';
import { theme as themeClasses } from '@/lib/theme-classes';

interface LanguageToggleProps {
  compact?: boolean;
  onLocaleChange?: (locale: Locale) => void;
}

export function LanguageToggle({ compact = false, onLocaleChange }: LanguageToggleProps) {
  const t = useTranslations('settings');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function setLocale(next: Locale) {
    router.replace(pathname, { locale: next });
    onLocaleChange?.(next);
  }

  const buttons = (
    <div className="flex gap-2" role="group" aria-label={t('language')}>
      <Button
        type="button"
        variant={locale === 'vi' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setLocale('vi')}
        aria-pressed={locale === 'vi'}
      >
        {t('languageVi')}
      </Button>
      <Button
        type="button"
        variant={locale === 'en' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
      >
        {t('languageEn')}
      </Button>
    </div>
  );

  if (compact) {
    return buttons;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={cn('m-0 text-sm font-medium', themeClasses.text)}>{t('language')}</p>
      {buttons}
    </div>
  );
}
