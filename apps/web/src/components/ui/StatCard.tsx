import type { ReactNode } from 'react'
import { Card } from './Card'
import { Icon, type IconName } from './Icon'
import { METRIC_TONES, type MetricTone } from './metricTones'

export interface StatCardProps {
  label: string
  value: ReactNode
  /** The tinted icon chip the approved tile leads with. */
  icon?: IconName
  tone?: MetricTone
  /** A supporting line under the value — a period, a comparison, a caveat. */
  trend?: ReactNode
  /** Ruled footer content, usually a "View all →" link. */
  footer?: ReactNode
  className?: string
}

/**
 * The approved dashboard stat tile (design-reference/presentation-refresh-2026, references 07-10):
 * a tinted icon chip, the label above a large navy figure, and an optional ruled footer link.
 *
 * <p>The references also show a period-over-period delta on each tile ("↗ 12% from last month").
 * FursadHub has no historical metric endpoint, so there is no `delta` prop — a tile shows the
 * number the API actually returned, and `trend` carries only text a caller can honestly supply.
 */
export function StatCard({ label, value, icon, tone = 'brand', trend, footer, className }: StatCardProps) {
  return (
    <Card padding="none" className={className}>
      <div className="flex items-start gap-3 p-5">
        {icon && (
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${METRIC_TONES[tone]}`}>
            <Icon name={icon} className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground-secondary">{label}</p>
          <p className="mt-1 truncate font-display text-2xl font-extrabold leading-none text-brand-navy dark:text-foreground">
            {value}
          </p>
          {trend && <div className="mt-2 text-xs text-foreground-secondary">{trend}</div>}
        </div>
      </div>
      {footer && <div className="border-t border-border px-5 py-3 text-sm">{footer}</div>}
    </Card>
  )
}
