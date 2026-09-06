import type { ReactNode } from 'react'
import { Card } from './Card'
import { Badge } from './Badge'
import { Icon } from './Icon'
import { VerifiedBadge } from './VerifiedBadge'
import { cn } from '../../lib/utils/cn'

export interface InternshipCardProps {
  title: string
  organization: string
  /** Renders the approved compact blue check beside the organization name. */
  organizationVerified?: boolean
  location?: string
  workMode?: string
  duration?: string
  /** Blue category chips, as on the approved cards. */
  tags?: string[]
  deadline?: ReactNode
  logo?: ReactNode
  actions?: ReactNode
  /**
   * `comfortable` is the three-up directory card of reference 02, which carries a "View details"
   * control in a ruled footer. `compact` is the six-up featured strip of reference 01: narrower,
   * denser, and with the deadline as the only footer content — the whole card is the link there.
   */
  density?: 'comfortable' | 'compact'
  children?: ReactNode
  className?: string
}

/**
 * The approved internship card (design-reference/presentation-refresh-2026, references 01/02):
 * organization identity on top, the role title beneath it, an icon meta row, blue category chips,
 * then a ruled footer carrying the deadline and — at comfortable density — the card's action.
 *
 * <p>Every field is optional except the title and organization, so a card renders honestly against
 * whatever the API actually returned rather than showing empty slots.
 */
export function InternshipCard({
  title,
  organization,
  organizationVerified = false,
  location,
  workMode,
  duration,
  tags,
  deadline,
  logo,
  actions,
  density = 'comfortable',
  children,
  className,
}: InternshipCardProps) {
  const compact = density === 'compact'

  const meta = [
    location ? { icon: 'globe' as const, label: location } : null,
    duration ? { icon: 'clipboard' as const, label: duration } : null,
    workMode ? { icon: 'briefcase' as const, label: workMode } : null,
  ].filter((entry): entry is { icon: 'globe' | 'clipboard' | 'briefcase'; label: string } => entry !== null)

  return (
    <Card interactive padding="none" className={cn('flex h-full flex-col', className)}>
      <div className={cn('flex flex-1 flex-col', compact ? 'p-3.5' : 'p-5')}>
        <div className="flex items-center gap-2">
          {logo && <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded">{logo}</span>}
          <span className="truncate text-xs font-bold text-brand-navy dark:text-foreground">{organization}</span>
          {organizationVerified && <VerifiedBadge size="sm" />}
        </div>

        <h3
          className={cn(
            'line-clamp-2 font-display font-extrabold leading-snug tracking-tight text-brand-navy dark:text-foreground',
            compact ? 'mt-2 text-[15px]' : 'mt-2.5 text-[17px]',
          )}
        >
          {title}
        </h3>

        {meta.length > 0 && (
          <ul
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground-secondary',
              compact ? 'mt-2' : 'mt-2.5',
            )}
          >
            {meta.map((entry) => (
              <li key={entry.label} className="flex min-w-0 items-center gap-1">
                <Icon name={entry.icon} className="size-3 shrink-0" />
                <span className="truncate">{entry.label}</span>
              </li>
            ))}
          </ul>
        )}

        {tags && tags.length > 0 && (
          <div className={cn('flex flex-wrap gap-1.5', compact ? 'mt-2' : 'mt-2.5')}>
            {tags.map((tag) => (
              <Badge key={tag} tone="brand" className="px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {children && (
          <div className={cn('text-sm leading-6 text-foreground-secondary', compact ? 'mt-2 text-xs leading-5' : 'mt-3')}>
            {children}
          </div>
        )}
      </div>

      {(deadline || actions) && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 border-t border-border',
            compact ? 'px-3.5 py-2' : 'px-5 py-3',
          )}
        >
          {deadline && (
            <span className="flex items-center gap-1.5 text-[11px] text-foreground-secondary">
              <Icon name="document" className="size-3 shrink-0" />
              {deadline}
            </span>
          )}
          {actions}
        </div>
      )}
    </Card>
  )
}
