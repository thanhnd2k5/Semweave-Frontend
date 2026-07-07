'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { theme as themeClasses } from '@/lib/theme-classes';
import { useTheme } from './use-theme';

interface ThemeToggleProps {
  /** Header layout: inline buttons without section label */
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const t = useTranslations('settings');
  const { theme, setTheme } = useTheme();

  const buttons = (
    <div className="flex gap-2" role="group" aria-label={t('appearance')}>
      <Button
        type="button"
        variant={theme === 'light' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
      >
        {t('themeLight')}
      </Button>
      <Button
        type="button"
        variant={theme === 'dark' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
      >
        {t('themeDark')}
      </Button>
    </div>
  );

  if (compact) {
    return buttons;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={cn('m-0 text-sm font-medium', themeClasses.text)}>{t('appearance')}</p>
      {buttons}
    </div>
  );
}
