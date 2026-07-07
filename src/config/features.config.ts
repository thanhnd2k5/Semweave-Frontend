import { getEnvConfig } from './env';
import { getFeatureFlags, type EnvConfig, type FeatureFlags } from './env.schema';

/**
 * Single source of truth for auth feature flag.
 * Works in Edge (middleware) and Node (server) — reads env strings directly.
 * NEXT_PUBLIC_FEATURE_AUTH is baked from FEATURE_AUTH in next.config.ts at build time.
 */
export function isAuthEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.FEATURE_AUTH === 'true' || env.NEXT_PUBLIC_FEATURE_AUTH === 'true';
}

export function getEnabledFeatures(): FeatureFlags {
  const flags = getFeatureFlags(getEnvConfig());
  // Keep AppInfoPanel in sync with middleware/pages (isAuthEnabled reads both env vars).
  return { ...flags, auth: isAuthEnabled() };
}

export type { EnvConfig, FeatureFlags };
