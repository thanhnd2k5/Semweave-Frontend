import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'size-5',
  md: 'size-8',
  lg: 'size-12',
} as const;

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2" role="status" aria-label={label ?? 'Loading'}>
      <span
        className={cn(
          'animate-spin rounded-full border-[3px]',
          theme.spinnerTrack,
          theme.spinnerAccent,
          sizeClasses[size],
        )}
      />
      {label ? <span className={cn('text-sm', theme.muted)}>{label}</span> : null}
    </div>
  );
}
