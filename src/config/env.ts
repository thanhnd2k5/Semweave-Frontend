import { envSchema, type EnvConfig } from './env.schema';

let cached: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cached) {
    return cached;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }

  cached = result.data;
  return cached;
}
