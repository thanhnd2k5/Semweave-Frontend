import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

/**
 * Loading placeholder — docs/design.md §8.7. Match the exact dimensions of the
 * content it replaces (e.g. `<Skeleton className="h-6 w-40" />` for a title).
 * Pulse respects `prefers-reduced-motion` globally (globals.css).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(theme.skeleton, className)} aria-hidden {...props} />;
}
