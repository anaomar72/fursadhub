import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { Badge } from './Badge'
import { Icon, type IconName } from './Icon'
import { VerifiedBadge } from './VerifiedBadge'
import { cn } from '../../lib/utils/cn'

export interface InternshipCardProps {
  title: string
  organization: string
  /** Renders the compact blue check beside the organization name. */
  organizationVerified?: boolean
  location?: string
  workMode?: string
  duration?: string
  /**
   * Backend Phase B3 facts, rendered in the same meta row as location and duration because they are
   * the same KIND of fact — already formatted by the caller, since money and hours are
   * locale-sensitive and this component does no formatting.
   */
  compensation?: string
  hours?: string
  /**
   * Makes the TITLE the card's link, stretched over the whole card. This is the preferred
   * navigation: one tab stop per card, named by the role title, rather than the tenth identical
   * "View details". Controls inside the card (the bookmark) sit above the stretched link.
   */
  titleTo?: string
  /** Category chips — skills, as on the approved cards. */
  tags?: string[]
  deadline?: ReactNode
  logo?: ReactNode
  actions?: ReactNode
  /**
   * The save/unsave control, pinned to the header's trailing edge. A slot rather than a built-in
   * bookmark: this card also renders for signed-out visitors, where there is nothing to save to.
   */
  bookmark?: ReactNode
  /**
   * `comfortable` for directory grids; `compact` for tighter rows (dashboards, related lists).
   * Density comes from padding and gaps — never from smaller type.
   */
  density?: 'comfortable' | 'compact'
  children?: ReactNode
  className?: string
}

/**
 * The one internship card — public marketplace, home page and student portal alike.
 *
 * <p>Reading order is the order a student decides in: WHO is offering it (logo, name, verification),
 * WHAT the role is (the title, the most prominent thing on the card), WHERE and HOW (location, work
 * mode, duration, pay, hours), what skills it asks for, and WHEN to apply by. Every field except the
 * title and organization is optional, so a card renders honestly against whatever the API returned
 * rather than showing empty slots.
 *
 * <p>Metadata is plain text with icons, not chips: a row of five pills competes with the title. Skill
 * tags stay chips because they are a set the eye compares across cards.
 */
export function InternshipCard({
  title,
  organization,
  organizationVerified = false,
  location,
  workMode,
  duration,
  compensation,
  hours,
  titleTo,
  tags,
  deadline,
  logo,
  actions,
  bookmark,
  density = 'comfortable',
  children,
  className,
}: InternshipCardProps) {
  const compact = density === 'compact'

  type MetaEntry = { icon: IconName; label: string }
  const candidates: (MetaEntry | null)[] = [
    location ? { icon: 'mapPin', label: location } : null,
    workMode ? { icon: 'briefcase', label: workMode } : null,
    duration ? { icon: 'calendar', label: duration } : null,
    compensation ? { icon: 'coins', label: compensation } : null,
    hours ? { icon: 'clock', label: hours } : null,
  ]
  const meta = candidates.filter((entry): entry is MetaEntry => entry !== null)

  return (
    <Card interactive padding="none" className={cn('relative flex h-full flex-col', className)}>
      <div className={cn('flex flex-1 flex-col', compact ? 'p-4' : 'p-5')}>
        <div className="flex items-center gap-3">
          {/*
            The mark is ALWAYS reserved, so every card in a row starts its text at the same x. The
            fallback is the organization's own initial — it invents no brand it does not have.
          */}
          <span
            className={cn(
              'flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface font-display font-extrabold text-brand-blue',
              compact ? 'size-9 text-body' : 'size-10 text-body-lg',
            )}
          >
            {logo ?? organization.trim().charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-body font-semibold text-foreground-secondary">{organization}</span>
            {organizationVerified && <VerifiedBadge size="sm" />}
          </span>
          {bookmark && <span className="relative z-10 ms-auto -me-1.5 shrink-0">{bookmark}</span>}
        </div>

        <h3
          className={cn(
            'line-clamp-2 break-words font-display text-foreground',
            compact ? 'mt-3 text-body font-bold' : 'mt-4 text-body-lg font-bold',
          )}
        >
          {titleTo ? (
            <Link
              to={titleTo}
              className="rounded-sm after:absolute after:inset-0 after:rounded-[inherit] hover:underline underline-offset-4 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-focus-ring"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>

        {meta.length > 0 && (
          <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-label font-normal text-foreground-secondary">
            {meta.map((entry) => (
              <li key={`${entry.icon}-${entry.label}`} className="flex min-w-0 items-center gap-1.5">
                <Icon name={entry.icon} className="size-4 shrink-0 text-muted" />
                <span className="truncate">{entry.label}</span>
              </li>
            ))}
          </ul>
        )}

        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} tone="brand" className="px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {children && <div className="mt-3 text-body text-foreground-secondary">{children}</div>}
      </div>

      {(deadline || actions) && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 border-t border-border',
            compact ? 'px-4 py-2.5' : 'px-5 py-3',
          )}
        >
          {deadline && (
            <span className="flex items-center gap-1.5 text-caption font-medium text-foreground-secondary">
              <Icon name="calendar" className="size-3.5 shrink-0" />
              {deadline}
            </span>
          )}
          {actions && <span className="relative z-10">{actions}</span>}
        </div>
      )}
    </Card>
  )
}
