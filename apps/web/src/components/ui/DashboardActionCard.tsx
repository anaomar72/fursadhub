import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils/cn'
import { StatusIndicator } from './StatusIndicator'
import type { StatusIndicatorProps } from './StatusIndicator'

export interface DashboardActionCardProps {
  label: string
  value: number
  to: string
  /** Shown under the count — usually "Needs action" vs "Nothing outstanding" (never color alone). */
  statusLabel: string
  tone: StatusIndicatorProps['tone']
}

/**
 * One "next action" tile on a role dashboard (BRAND_AND_UI_GUIDELINES.md section 7: "prioritize
 * workflow and next action rather than decorative charts"). The same card shape across
 * Student/University/Organization dashboards, and the same hover motion as the landing page's door
 * cards — one visual/motion language for the whole product, not a different one per area.
 */
export function DashboardActionCard({ label, value, to, statusLabel, tone }: DashboardActionCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border bg-surface p-4',
        // Matches Card: border/shadow emphasis, no lift, and the transition is scoped to the two
        // properties that actually change rather than `all`. It previously had no
        // `motion-reduce` guard at all, so a visitor who asked for reduced motion still got the
        // movement (CLAUDE.md section 58).
        'transition-[border-color,box-shadow] duration-150 ease-in-out motion-reduce:transition-none',
        'hover:border-brand-accent hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
      )}
    >
      <p className="text-sm text-foreground-secondary">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">{value}</p>
      <StatusIndicator tone={tone} label={statusLabel} />
    </Link>
  )
}
