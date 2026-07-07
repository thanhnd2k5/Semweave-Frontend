import { getEnvConfig } from '@/config/env';
import { getEnabledFeatures } from '@/config/features.config';
import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

export function AppInfoPanel() {
  const env = getEnvConfig();
  const features = getEnabledFeatures();

  const featureEntries = Object.entries(features).filter(([, enabled]) => enabled);

  return (
    <section className={cn('rounded-lg p-8', theme.surface)}>
      <h1 className="mb-1 text-[1.75rem]">{env.APP_NAME}</h1>
      <p className={cn('mb-6', theme.muted)}>v{env.APP_VERSION}</p>

      <div className="mt-4">
        <h2 className={cn('mb-2 text-base', theme.muted)}>Features</h2>
        {featureEntries.length > 0 ? (
          <ul className="m-0 pl-6">
            {featureEntries.map(([name]) => (
              <li key={name}>
                <code className={theme.code}>{name}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn('m-0', theme.muted)}>Core only — enable optional features via env.</p>
        )}
      </div>
    </section>
  );
}
