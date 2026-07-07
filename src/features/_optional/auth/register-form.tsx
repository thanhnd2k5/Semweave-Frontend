'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/infrastructure/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/common/errors/api-error';
import { translateApiError } from '@/common/errors/translate-api-error';
import { ROUTES } from '@/common/constants/routes';
import { useAuth } from './use-auth';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

export function RegisterForm() {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    try {
      await register(email, password);
      router.push(ROUTES.dashboard);
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
      <h1 className="mb-2 text-center">{t('register')}</h1>

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
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Input
        label={t('confirmPassword')}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      {error ? (
        <p className={cn('m-0', theme.errorSurface)} role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
        {t('register')}
      </Button>
    </form>
  );
}
