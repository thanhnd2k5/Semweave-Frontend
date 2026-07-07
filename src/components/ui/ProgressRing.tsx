import { cn } from '@/lib/cn';
import { theme } from '@/lib/theme-classes';

type ProgressRingSize = 'sm' | 'md' | 'lg';

interface ProgressRingProps {
  /** 0-100. Caller computes from domain data (e.g. wordsReviewed / wordsDue * 100). */
  value: number;
  size?: ProgressRingSize;
  label?: string;
  /** Rendered in the ring center, e.g. "7/10". */
  children?: React.ReactNode;
  className?: string;
}

const sizeConfig: Record<ProgressRingSize, { box: number; stroke: number }> = {
  sm: { box: 40, stroke: 3 },
  md: { box: 64, stroke: 4 },
  lg: { box: 96, stroke: 5 },
};

/** Dashboard progress ring — docs/design.md §8.6. Accent stroke, border track. */
export function ProgressRing({ value, size = 'md', label, children, className }: ProgressRingProps) {
  const { box, stroke } = sizeConfig[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: box, height: box }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)}%`}
    >
      <svg width={box} height={box} className="-rotate-90">
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={theme.progressTrack}
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(theme.progressFill, 'transition-[stroke-dashoffset] duration-300 ease-out')}
        />
      </svg>
      {children ? (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-text-primary">
          {children}
        </span>
      ) : null}
    </div>
  );
}
