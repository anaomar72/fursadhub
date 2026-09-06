/**
 * The four tints the approved dashboard stat tiles use (design-reference/presentation-refresh-2026,
 * references 07-10): blue, green, orange and violet icon chips over a white card.
 *
 * <p>THE one definition. Six dashboards previously each carried their own identical copy of this
 * map, which is exactly how a system ends up with four slightly different oranges. Every colour
 * here resolves through the central palette in `lib/design-system/tokens.css`.
 */
export const METRIC_TONES = {
  brand: 'bg-brand-blue-soft text-brand-blue',
  violet: 'bg-brand-navy-soft text-brand-navy dark:text-foreground',
  teal: 'bg-success-bg text-success',
  amber: 'bg-brand-accent-soft text-brand-accent-ink',
} as const

export type MetricTone = keyof typeof METRIC_TONES
