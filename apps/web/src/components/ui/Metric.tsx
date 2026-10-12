import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils/cn'

export interface MetricProps {
  label: string
  /** The figure exactly as the API returned it — formatted, never derived into a trend. */
  value: ReactNode
  /**
   * One honest supporting line: a scope ("across 3 internships"), a caveat, a date. There is no
   * delta/trend prop on purpose — FursadHub has no historical metric endpoint, so a "↗ 12%" here
   * would be invented.
   */
  context?: ReactNode
  /** Where the figure leads. When set, the whole metric is the link and its name is label + value. */
  to?: string
  className?: string
}

/**
 * A KPI WITHOUT a box: label, figure, optional context.
 *
 * <p>Use it inside a surface that already exists — a row of figures in a {@link Panel}, an
 * attention strip, a detail page's summary — where wrapping each number in its own card would
 * create the card-inside-card stacking the redesign is removing. For a free-standing dashboard
 * tile, place it in a bordered figures list as the role dashboards do.
 */
export function Metric({ label, value, context, to, className }: MetricProps) {
  const body = (
    <>
      <span className="block break-words text-body font-medium text-foreground-secondary">{label}</span>
      <span className="mt-1 block font-display text-metric tabular-nums text-foreground">{value}</span>
      {context && <span className="mt-1 block text-caption text-foreground-secondary">{context}</span>}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          'group block min-w-0 rounded-md -m-1 p-1 transition-colors duration-150 motion-reduce:transition-none',
          'hover:[&>span:nth-child(2)]:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          className,
        )}
      >
        {body}
      </Link>
    )
  }

  return <div className={cn('min-w-0', className)}>{body}</div>
}
