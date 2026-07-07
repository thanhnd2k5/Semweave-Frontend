import { z } from 'zod';

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((val) => val === true || val === 'true');

const optionalUrl = z.preprocess(
  (val) => (val === '' || val === undefined ? undefined : val),
  z.string().url().optional(),
);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_NAME: z.string().default('nextjs-starter-tailwind'),
    APP_VERSION: z.string().default('1.0.0'),

    NEXT_PUBLIC_API_URL: optionalUrl,
    NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['vi', 'en']).default('vi'),

    FEATURE_AUTH: booleanFromEnv.default(false),
    FEATURE_API_PROXY: booleanFromEnv.default(false),
    FEATURE_OFFLINE: booleanFromEnv.default(false),

    API_PROXY_TARGET: optionalUrl,
  })
  .superRefine((data, ctx) => {
    const hasApiTarget = !!data.NEXT_PUBLIC_API_URL || data.FEATURE_API_PROXY;

    if (data.FEATURE_AUTH && !hasApiTarget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'FEATURE_AUTH requires NEXT_PUBLIC_API_URL or FEATURE_API_PROXY=true with API_PROXY_TARGET',
        path: ['NEXT_PUBLIC_API_URL'],
      });
    }

    if (data.FEATURE_API_PROXY && !data.API_PROXY_TARGET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API_PROXY_TARGET is required when FEATURE_API_PROXY=true',
        path: ['API_PROXY_TARGET'],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export interface FeatureFlags {
  auth: boolean;
  apiProxy: boolean;
  offline: boolean;
}

export function getFeatureFlags(env: EnvConfig): FeatureFlags {
  return {
    auth: env.FEATURE_AUTH,
    apiProxy: env.FEATURE_API_PROXY,
    offline: env.FEATURE_OFFLINE,
  };
}
