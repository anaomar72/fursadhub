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
  /** Renders the approved compact blue check beside the organization name. */
  organizationVerified?: boolean
  location?: string
  workMode?: string
  duration?: string
  /**
   * Backend Phase B3 facts, rendered in the same icon meta row as location and duration because
   * they are the same KIND of fact — already formatted by the caller, since money and hours are
   * locale-sensitive and this component does no formatting.
   */
  compensation?: string
  hours?: string
  /**
   * Makes the TITLE the card's link, covering the whole card via a stretched overlay.
   *
   * <p>Opt-in rather than automatic: the public marketplace cards of Phase C carry their navigation
   * in an explicit "View details" footer control and are left exactly as approved. Inside the
   * student portal the title itself is the link, because a signed-in student scans a grid by role
   * title and a screen reader should reach the internship by its name rather than by the tenth
   * identical "View details".
   */
  titleTo?: string
  /** Blue category chips, as on the approved cards. */
  tags?: string[]
  deadline?: ReactNode
  logo?: ReactNode
  actions?: ReactNode
  /**
   * The save/unsave control, pinned to the header's trailing edge as in the approved student
   * reference. A slot rather than a built-in bookmark: this card also renders for signed-out
   * visitors on the public marketplace, where there is nothing to save to.
   */
  bookmark?: ReactNode
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
    location ? { icon: 'globe', label: location } : null,
    duration ? { icon: 'clipboard', label: duration } : null,
    workMode ? { icon: 'briefcase', label: workMode } : null,
    compensation ? { icon: 'coins', label: compensation } : null,
    hours ? { icon: 'clock', label: hours } : null,
  ]
  const meta = candidates.filter((entry): entry is MetaEntry => entry !== null)

  return (
    <Card interactive padding="none" className={cn('flex h-full flex-col', className)}>
      {/*
        `compact` is narrower and tighter than `comfortable` — it is not smaller TYPE. The title had
        been pushed to 12px and every piece of metadata to 11px, which made the product's primary
        object on its own landing page the least readable thing on that page. Density now comes from
        padding and gaps; the title sits at 14px against the comfortable variant's 17px.
      */}
      <div className={cn('flex flex-1 flex-col', compact ? 'p-4' : 'p-5')}>
        <div className="flex items-center gap-2">
          {/*
            The mark is ALWAYS reserved. Organizations that have not uploaded a logo previously
            rendered no mark at all, so their card's header began at a different x than the cards
            beside it and the row lost its left alignment — the strongest thing the eye uses to scan
            a grid. The fallback is the organization's own initial, not a stand-in logo: it invents
            no brand it does not have.
          */}
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded bg-brand-blue-soft text-[11px] font-extrabold text-brand-blue">
            {logo ?? organization.trim().charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-[13px] font-bold text-brand-navy dark:text-foreground">{organization}</span>
          {organizationVerified && <VerifiedBadge size="sm" />}
          {bookmark && <span className="relative z-10 ms-auto -me-1.5 -mt-1.5">{bookmark}</span>}
        </div>

        <h3
          className={cn(
            'line-clamp-2 font-display font-extrabold leading-snug tracking-tight text-brand-navy dark:text-foreground',
            compact ? 'mt-2 text-sm' : 'mt-2.5 text-[17px]',
          )}
        >
          {titleTo ? (
            // `after:absolute after:inset-0` stretches the hit area over the whole card. The
            // bookmark above sits at z-10 so it stays clickable through this overlay.
            <Link
              to={titleTo}
              className="after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>

        {meta.length > 0 && (
          <ul
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-secondary',
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
            compact ? 'border-t-0 px-4 pb-4 pt-1' : 'px-5 py-3',
          )}
        >
          {deadline && (
            <span className="flex items-center gap-1.5 text-xs text-foreground-secondary">
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
