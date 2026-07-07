'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/infrastructure/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/common/errors/api-error';
import { translateApiError } from '@/common/errors/translate-api-error';
import { resolvePostLoginPath } from '@/common/constants/routes';
import { routing } from '@/infrastructure/i18n/routing';
import { useAuth } from './use-auth';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

export function LoginForm() {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
      const redirectTo = resolvePostLoginPath(
        searchParams.get('from'),
        routing.locales,
      );
      router.push(redirectTo);
    } catch (err) {
      const apiErr = ApiError.fromUnknown(err);
      setError(translateApiError(tErrors, apiErr.code, apiErr.message));
    }
  }

  return (
    <form
      className={cn('mx-auto flex w-full max-w-sm flex-col gap-4 rounded-lg p-8', theme.surface)}
      onSubmit={handleSubmit}
    >
      <h1 className="mb-2 text-center">{t('login')}</h1>

      <Input
        label={t('email')}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label={t('password')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error ? (
        <p className={cn('m-0', theme.errorSurface)} role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
        {t('login')}
      </Button>
    </form>
  );
}
