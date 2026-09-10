import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { Icon, type IconName } from './Icon'
import { METRIC_TONES, type MetricTone } from './metricTones'
import { cn } from '../../lib/utils/cn'

export interface StatCardProps {
  label: string
  value: ReactNode
  /** The tinted icon chip the approved tile leads with. */
  icon?: IconName
  tone?: MetricTone
  /** A supporting line under the value — a period, a comparison, a caveat. */
  trend?: ReactNode
  /**
   * Where the tile navigates. When set, the WHOLE tile is the link — see the note below on why this
   * replaced a "View all" link repeated on every tile in a row.
   */
  to?: string
  /** Ruled footer content. Only for the rare tile that needs something a link cannot express. */
  footer?: ReactNode
  className?: string
}

/**
 * The approved dashboard stat tile (design-reference/presentation-refresh-2026, references 07-10):
 * a tinted icon chip, the label above a large navy figure, and an optional supporting line.
 *
 * <p><strong>The whole tile is the target, rather than a "View all" link inside it.</strong> All
 * three portals previously rendered their own copy of this tile with its own link in it, so a
 * four-tile row shipped four identical "View all" links — the same words four times, competing with
 * the numbers they sat under, and in the student portal separated from the value by a gap that made
 * every tile half empty. Reference 07 has no such link and no chevron: the tile itself is the
 * affordance, the hover border states it, and the accessible name is the label and value, so a
 * screen reader hears "Applications, 6" rather than the fourth "View all" in a row. A chevron was
 * tried and removed — at four tiles across a portal column there is no room for one beside a label
 * like "Saved internships", and it collided with the text.
 *
 * <p>The references also show a period-over-period delta on each tile ("↗ 12% from last month").
 * FursadHub has no historical metric endpoint, so there is no `delta` prop — a tile shows the
 * number the API actually returned, and `trend` carries only text a caller can honestly supply.
 */
export function StatCard({ label, value, icon, tone = 'brand', trend, to, footer, className }: StatCardProps) {
  const body = (
    <div className="flex items-start gap-3 p-5">
      {icon && (
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${METRIC_TONES[tone]}`}>
          <Icon name={icon} className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {/* Wraps rather than truncates: at four or five across, "Saved internships" and its longer
            Somali counterpart do not fit on one line, and a counter whose label reads
            "Saved internshi…" has lost the thing the number is about. */}
        <p className="text-sm font-medium leading-snug text-foreground-secondary">{label}</p>
        <p className="mt-1 font-display text-3xl font-extrabold leading-none text-brand-navy dark:text-foreground">
          {value}
        </p>
        {trend && <div className="mt-2 text-xs leading-4 text-foreground-secondary">{trend}</div>}
      </div>
    </div>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          'group block min-w-0 rounded-xl border border-border bg-surface shadow-xs',
          'transition-[border-color,box-shadow] duration-150 ease-in-out motion-reduce:transition-none',
          'hover:border-brand-accent hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          className,
        )}
      >
        {body}
      </Link>
    )
  }

  return (
    <Card padding="none" className={className}>
      {body}
      {footer && <div className="border-t border-border px-5 py-3 text-sm">{footer}</div>}
    </Card>
  )
}
