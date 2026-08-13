/**
 * Semantic Tailwind classes — maps to CSS variables in globals.css.
 * Source of truth: docs/design.md §2, §4.
 */
export const theme = {
  body: 'bg-bg-base text-text-primary',
  surface: 'rounded-lg border border-border bg-bg-surface',
  text: 'text-text-primary',
  muted: 'text-text-muted',
  code: 'rounded-sm bg-bg-elevated px-1.5 py-0.5 font-mono text-sm text-text-primary',
  link: 'text-accent hover:text-accent-hover hover:underline',
  linkMuted:
    'text-text-muted no-underline hover:text-accent hover:underline',
  input:
    // h-11 = 44px min tap target (design.md §14.3)
    'h-11 w-full rounded-md border border-border bg-bg-surface px-4 font-inherit text-base text-text-primary outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-2 focus:ring-accent/35',
  textarea:
    'min-h-24 w-full resize-y rounded-md border border-border bg-bg-surface px-4 py-3 font-inherit text-base text-text-primary outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-2 focus:ring-accent/35',
  spinnerTrack: 'border-border',
  spinnerAccent: 'border-t-accent',
  buttonPrimary:
    'bg-accent text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-55',
  buttonSecondary:
    'border border-border bg-bg-surface text-text-primary hover:border-accent disabled:cursor-not-allowed disabled:opacity-55',
  buttonGhost:
    'bg-transparent text-text-muted hover:bg-bg-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-55',
  navButtonSecondary:
    'inline-block rounded-md border border-border px-4 py-2 text-text-primary no-underline hover:border-accent hover:no-underline',
  headerBorder: 'border-b border-border',
  errorText: 'text-error',
  errorBorder: 'border-error',
  errorSurface: 'rounded-md bg-error/10 px-4 py-2 text-sm text-error',
  warnSurface: 'rounded-md bg-warm/15 px-4 py-3 text-sm text-warm',
  successText: 'text-success',
  successDot: 'size-2 rounded-full bg-success',

  // Badge (docs/design.md §8.3)
  badgeNeutral: 'border border-border bg-bg-elevated text-text-muted',
  badgeAccent: 'bg-accent-subtle text-accent',
  badgeSuccess: 'bg-success/15 text-success',
  badgeError: 'bg-error/15 text-error',
  badgeWarm: 'bg-warm/15 text-warm',
  // Word Health L1-3 (light bg) need fixed dark ink; L4 (dark bg) needs white text
  healthBadgeLight: 'text-health-ink',
  healthBadgeDark: 'text-white',

  // Skeleton (docs/design.md §8.7)
  skeleton: 'animate-pulse rounded-md bg-bg-elevated',

  // ProgressRing (docs/design.md §8.6)
  progressTrack: 'stroke-border',
  progressFill: 'stroke-accent',

  // LinearProgress (docs/design.md §8.6b) — same accent language, bar shape
  progressTrackBar: 'bg-border',
  progressFillBar: 'bg-accent',

  // Modal (docs/design.md §8.10)
  modalBackdrop: 'absolute inset-0 bg-bg-base/70',
  modalPanel:
    'relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-md flex-col rounded-xl border border-border bg-bg-surface shadow-[0_4px_24px_rgba(0,0,0,0.25)]',

  // Radio (docs/design.md §8.11)
  radioRow:
    'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 transition-colors hover:bg-bg-elevated has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/35',
  radioIndicator:
    'flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-border',
  radioIndicatorSelected: 'border-accent',
  radioIndicatorDot: 'size-2 rounded-full bg-accent',
} as const;
