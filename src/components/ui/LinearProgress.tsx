import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

type LinearProgressSize = 'sm' | 'md';

interface LinearProgressProps {
  /** 0-100. Caller computes from domain data (e.g. answered / total * 100). */
  value: number;
  size?: LinearProgressSize;
  label?: string;
  className?: string;
}

const sizeConfig: Record<LinearProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2',
};

/**
 * Horizontal progress bar — docs/design.md §8.6b. Same track/fill language as
 * ProgressRing (§8.6), just a bar instead of a ring. Determinate only — every
 * progress in the app knows its total step count, no indeterminate/striped state.
 */
export function LinearProgress({ value, size = 'md', label, className }: LinearProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full', theme.progressTrackBar, sizeConfig[size], className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${Math.round(clamped)}%`}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300 ease-out', theme.progressFillBar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
