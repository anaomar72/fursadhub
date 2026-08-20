import { cn } from '../../lib/utils/cn'
import type { StatusTone } from './StatusBadge'

const DOT_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
}

export interface StatusIndicatorProps {
  tone: StatusTone
  label: string
  className?: string
}

/** Compact status dot + label, e.g. for table rows and lists. */
export function StatusIndicator({ tone, label, className }: StatusIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-foreground-secondary', className)}>
      <span className={cn('size-2 shrink-0 rounded-full', DOT_CLASSES[tone])} aria-hidden="true" />
      {label}
    </span>
  )
}
