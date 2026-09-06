import { cn } from '../../lib/utils/cn'
import type { StatusTone } from './StatusBadge'

export interface StatusDistributionItem {
  id: string
  label: string
  value: number
  tone: StatusTone
}

export interface StatusDistributionProps {
  items: StatusDistributionItem[]
  /** Accessible name for the whole figure, e.g. "Placements by status". */
  label: string
  emptyLabel: string
  className?: string
}

const BAR_TONE: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-border-strong',
}

/**
 * A labelled magnitude breakdown across a fixed set of STATES — placements by status, cases by
 * stage. Horizontal bars rather than a donut because these labels are long (and longer again in
 * Somali), and because six slices of a ring are harder to compare than six bar lengths.
 *
 * <p>Colour here is the design system's reserved status palette, not a categorical one, and every
 * row carries its own name and count as text — so the reading never depends on telling two hues
 * apart. The bars are `aria-hidden` decoration over that text, and the figure as a whole is a real
 * list, which is also its own table view.
 */
export function StatusDistribution({ items, label, emptyLabel, className }: StatusDistributionProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return <p className={cn('py-8 text-center text-sm text-foreground-secondary', className)}>{emptyLabel}</p>
  }

  return (
    <ul aria-label={label} className={cn('flex flex-col gap-3.5', className)}>
      {items
        .filter((item) => item.value > 0)
        .map((item) => {
          const percent = Math.round((item.value / total) * 100)
          return (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
                <span className="shrink-0 text-foreground-secondary">
                  <span className="font-bold text-foreground">{item.value}</span>
                  <span className="ml-1.5 text-xs">{percent}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none', BAR_TONE[item.tone])}
                  style={{ width: `${Math.max(percent, 2)}%` }}
                />
              </div>
            </li>
          )
        })}
    </ul>
  )
}
