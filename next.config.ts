import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { getEnvConfig } from './src/config/env';

const env = getEnvConfig();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_NAME: env.APP_NAME,
    NEXT_PUBLIC_APP_VERSION: env.APP_VERSION,
    NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL ?? '',
    NEXT_PUBLIC_DEFAULT_LOCALE: env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_FEATURE_AUTH: String(env.FEATURE_AUTH),
    NEXT_PUBLIC_FEATURE_API_PROXY: String(env.FEATURE_API_PROXY),
    NEXT_PUBLIC_FEATURE_OFFLINE: String(env.FEATURE_OFFLINE),
  },
};

const withNextIntl = createNextIntlPlugin('./src/infrastructure/i18n/request.ts');

export default withNextIntl(nextConfig);
