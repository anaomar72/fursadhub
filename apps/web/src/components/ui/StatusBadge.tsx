import type { ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  neutral: 'bg-surface-muted text-foreground-secondary',
}

export interface StatusBadgeProps {
  tone: StatusTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Status must never be conveyed by color alone (BRAND_AND_UI_GUIDELINES.md
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
