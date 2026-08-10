import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

type HealthLevel = 1 | 2 | 3 | 4;

interface WordHealthBadgeProps {
  level: HealthLevel;
  className?: string;
  ariaLabel?: string;
}

const bgClasses: Record<HealthLevel, string> = {
  1: 'bg-health-1',
  2: 'bg-health-2',
  3: 'bg-health-3',
  4: 'bg-health-4',
};

// L1-3 sit on light teal → fixed dark ink text; L4 is dark teal → white text.
// Health hex is identical in both themes (design.md §2.6), so text can't
// follow the theme-flipping `on-accent` token — see globals.css `--color-health-ink`.
const textClasses: Record<HealthLevel, string> = {
  1: theme.healthBadgeLight,
  2: theme.healthBadgeLight,
  3: theme.healthBadgeLight,
  4: theme.healthBadgeDark,
};

/**
 * Word Health level pill — docs/design.md §8.4, PRD §8.1.
 * Color always paired with the "Lx" text label (design.md §14.5 — not color-only).
 */
export function WordHealthBadge({ level, className, ariaLabel }: WordHealthBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1.5 text-xs font-semibold',
        bgClasses[level],
        textClasses[level],
        className,
      )}
      aria-label={ariaLabel ?? `Word health level ${level} of 4`}
    >
      L{level}
    </span>
  );
}
