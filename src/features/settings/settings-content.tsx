'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/common/constants/routes';
import type { UserSettings } from '@/common/types/api.types';
import { useAuth } from '@/features/_optional/auth/use-auth';
import { LanguageToggle } from '@/features/i18n/language-toggle';
import { useTheme, type Theme } from '@/features/theme/use-theme';
import { useRouter } from '@/infrastructure/i18n/navigation';
import type { Locale } from '@/infrastructure/i18n/routing';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { theme as themeClasses } from '@/lib/theme-classes';

const DEFAULT_SETTINGS: UserSettings = {
  dailyNewWordLimit: 3,
  sessionWordCount: 10,
  theme: 'dark',
  language: 'vi',
};

export function SettingsContent() {
  const t = useTranslations('settings');
  const tAuth = useTranslations('auth');
  const { user, logout, isAuthenticated, fetchProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const server = user?.settings ?? DEFAULT_SETTINGS;
  const [draftLimit, setDraftLimit] = useState<number | null>(null);
  const [draftSession, setDraftSession] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dailyLimit = draftLimit ?? server.dailyNewWordLimit;
  const sessionCount = draftSession ?? server.sessionWordCount;

  const patchSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      setSaveError(null);
      try {
        await api.patch<UserSettings>('/users/settings', partial);
        if (partial.dailyNewWordLimit !== undefined) {
          setDraftLimit(null);
        }
        if (partial.sessionWordCount !== undefined) {
          setDraftSession(null);
        }
        await fetchProfile();
      } catch {
        setSaveError(t('saveError'));
      }
    },
    [fetchProfile, t],
  );

  const scheduleLearningPatch = useCallback(
    (partial: Partial<UserSettings>) => {
      if (partial.dailyNewWordLimit !== undefined) {
        setDraftLimit(partial.dailyNewWordLimit);
      }
      if (partial.sessionWordCount !== undefined) {
        setDraftSession(partial.sessionWordCount);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void patchSettings(partial);
      }, 500);
    },
    [patchSettings],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  async function handleThemeChange(next: Theme) {
    setTheme(next);
    if (isAuthenticated) {
      await patchSettings({ theme: next });
    }
  }

  async function handleLocaleChange(locale: Locale) {
    if (isAuthenticated) {
      await patchSettings({ language: locale });
    }
  }

  async function handleLogout() {
    await logout();
    router.push(ROUTES.login);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <h1>{t('title')}</h1>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className={cn('m-0 text-sm font-medium', themeClasses.text)}>{t('appearance')}</p>
          <div className="flex gap-2" role="group" aria-label={t('appearance')}>
            <Button
              type="button"
              variant={theme === 'light' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => void handleThemeChange('light')}
              aria-pressed={theme === 'light'}
            >
              {t('themeLight')}
            </Button>
            <Button
              type="button"
              variant={theme === 'dark' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => void handleThemeChange('dark')}
              aria-pressed={theme === 'dark'}
            >
              {t('themeDark')}
            </Button>
          </div>
        </div>
        <LanguageToggle onLocaleChange={handleLocaleChange} />
      </section>

      <hr className={cn('m-0 border-0 border-t', themeClasses.headerBorder)} />

      <section className="flex flex-col gap-4">
        <p className={cn('m-0 text-sm font-medium', themeClasses.text)}>{t('learning')}</p>
        <Input
          label={t('dailyNewWordLimit')}
          name="dailyNewWordLimit"
          type="number"
          min={0}
          max={20}
          className="max-w-24"
          value={dailyLimit}
          onChange={(e) =>
            scheduleLearningPatch({
              dailyNewWordLimit: Number(e.target.value),
            })
          }
          disabled={!isAuthenticated}
        />
        <Input
          label={t('sessionWordCount')}
          name="sessionWordCount"
          type="number"
          min={5}
          max={30}
          className="max-w-24"
          value={sessionCount}
          onChange={(e) =>
            scheduleLearningPatch({
              sessionWordCount: Number(e.target.value),
            })
          }
          disabled={!isAuthenticated}
        />
        {saveError ? (
          <p className={cn('m-0 text-sm', themeClasses.errorSurface)} role="alert">
            {saveError}
          </p>
        ) : null}
      </section>

      <hr className={cn('m-0 border-0 border-t', themeClasses.headerBorder)} />

      <section className="flex flex-col gap-3">
        <p className={cn('m-0 text-sm font-medium', themeClasses.text)}>{t('account')}</p>
        {user?.email ? (
          <p className={cn('m-0', themeClasses.muted)}>{user.email}</p>
        ) : null}
        <p className={cn('m-0 text-sm', themeClasses.muted)}>{t('noApiKeyNote')}</p>
        {isAuthenticated ? (
          <Button type="button" variant="secondary" onClick={handleLogout} className="w-fit">
            {tAuth('logout')}
          </Button>
        ) : null}
      </section>
    </div>
  );
}
