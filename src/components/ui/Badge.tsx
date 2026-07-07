import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'error' | 'warm';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: theme.badgeNeutral,
  accent: theme.badgeAccent,
  success: theme.badgeSuccess,
  error: theme.badgeError,
  warm: theme.badgeWarm,
};

/** Generic pill — docs/design.md §8.3. Color is functional, never decorative. */
export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
