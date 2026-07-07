'use client';

import { Link } from '@/infrastructure/i18n/navigation';
import { ROUTES } from '@/common/constants/routes';
import { ThemeToggle } from '@/features/theme/theme-toggle';
import { clientEnv } from '@/config/env.client';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

export function AppHeader() {
  return (
    <header
      className={cn(
        'mb-8 flex items-center justify-between gap-4 border-b pb-4',
        theme.headerBorder,
      )}
    >
      <Link href={ROUTES.home} className={cn('text-base font-semibold no-underline', theme.text)}>
        {clientEnv.appName}
      </Link>
      <ThemeToggle compact />
    </header>
  );
}
