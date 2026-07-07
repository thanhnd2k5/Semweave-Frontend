import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: theme.buttonPrimary,
  secondary: theme.buttonSecondary,
  ghost: theme.buttonGhost,
};

// h-11/h-12 = 44/48px min tap target (design.md §14.3). `sm` is under 44px —
// desktop/secondary use only, never the primary mobile action (design.md §8.1).
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-12 px-6 text-[1.0625rem]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent font-medium transition-[background,border-color,opacity] duration-150',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span
          className="size-[1em] animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : null}
      <span className={isLoading ? 'opacity-70' : undefined}>{children}</span>
    </button>
  );
}
