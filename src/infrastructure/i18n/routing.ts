import { defineRouting } from 'next-intl/routing';
import { clientEnv } from '@/config/env.client';

export const routing = defineRouting({
  locales: ['vi', 'en'] as const,
  defaultLocale: clientEnv.defaultLocale,
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
