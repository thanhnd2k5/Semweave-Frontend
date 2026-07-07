import { redirect } from 'next/navigation';
import { routing } from '@/infrastructure/i18n/routing';

/** Root-level not-found — redirect to default locale home. */
export default function RootNotFound() {
  redirect(`/${routing.defaultLocale}`);
}
