import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/*
 * Every tone carries a border, but only `neutral` needs one to exist at all.
 *
 * <p>The four coloured tones have a tinted ground that separates them from any surface in the
 * system. `neutral` is `bg-surface-muted` — which is also the ground of a pipeline column, an inset
 * panel and a table's zebra row — so a neutral badge placed on one of those was a muted rectangle
 * on an identically muted rectangle, and simply disappeared. That silently affected real states,
 * not edge cases: SUBMITTED, WITHDRAWN, OFFER_DECLINED and OFFER_EXPIRED are all neutral, so the
 * first column of the candidate pipeline rendered its stage label as floating text while the five
 * beside it read as badges.
 *
 * <p>The coloured borders are the same hue as the text at low alpha, so they read as the edge of
 * the badge rather than as a second colour, and they give every status a non-colour cue as well —
 * a shape that survives being desaturated (CLAUDE.md section 58 / WCAG 1.4.1).
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'border border-success/20 bg-success-bg text-success',
  warning: 'border border-warning/20 bg-warning-bg text-warning',
  danger: 'border border-danger/20 bg-danger-bg text-danger',
  info: 'border border-info/20 bg-info-bg text-info',
  neutral: 'border border-border-strong bg-surface-muted text-foreground-secondary',
}

export interface StatusBadgeProps {
  tone: StatusTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Status must never be conveyed by color alone (CLAUDE.md section 57
 * section 9/17) — always pair the tone with an icon and explicit text.
 */
export function StatusBadge({ tone, icon, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
