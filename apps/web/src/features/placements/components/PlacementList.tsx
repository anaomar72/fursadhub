import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card, EmptyState, StatusBadge } from '../../../components/ui'
import { formatDate } from '../../../lib/utils/formatDate'
import { PLACEMENT_STATUS_TONE } from './statusTone'
import type { PlacementResponse } from '../types'

interface PlacementListProps {
  placements: PlacementResponse[]
  /** Builds the detail link for the area this list is rendered in. */
  detailPath: (placement: PlacementResponse) => string
  /** Students see the opportunity; staff need to know which student each row is. */
  audience: 'student' | 'staff'
  emptyMessage: string
  /**
   * The list's accessible name.
   *
   * <p>Required, not optional. Each row is an `h3`, and every page that renders this list puts it
   * directly under the page `h1` — so without a heading of its own the spine jumped h1 to h3 and
   * the list was unnamed, on both pages that use it. Making the prop mandatory means a third call
   * site cannot reintroduce the gap by forgetting it.
   */
  heading: string
}

/**
 * The shared placement list used by the student, university and organization areas, so the same
 * placement reads identically wherever it appears (WCAG 1.4.1).
 *
 * <p>This component never filters: what arrives has already been scoped by the backend query for
 * the caller's real role, and re-filtering here would imply the UI is part of the boundary. It is
 * not (CLAUDE.md section 24).
 */
export function PlacementList({ placements, detailPath, audience, emptyMessage, heading }: PlacementListProps) {
  const { t } = useTranslation()
  const headingId = 'placement-list-heading'

  if (placements.length === 0) {
    return <EmptyState title={emptyMessage} />
  }

  return (
    <section aria-labelledby={headingId}>
      {/* Visually hidden: every page that renders this list already carries a visible title above
          it, so a second one would be noise on screen while the omission was only ever in the
          semantics. */}
      <h2 id={headingId} className="sr-only">{heading}</h2>
      <ul className="flex flex-col gap-3">
      {placements.map((placement) => {
        const primary =
          audience === 'student'
            ? (placement.opportunityTitle ?? t('placements:detail.untitledOpportunity'))
            : (placement.studentFullName ?? placement.studentEmail ?? placement.studentUserId)

        const secondary =
          audience === 'student'
            ? placement.organizationName
            : (placement.opportunityTitle ?? t('placements:detail.untitledOpportunity'))

        return (
          <li key={placement.id}>
            <Card interactive padding="lg" className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-foreground">
                  <Link to={detailPath(placement)} className="focus-visible:outline-none focus-visible:underline after:absolute after:inset-0">
                    {primary}
                  </Link>
                </h3>
                {secondary && <p className="mt-1 truncate text-sm text-foreground-secondary">{secondary}</p>}
                <p className="mt-1 text-xs text-muted">
                  {t('placements:detail.dateRange', {
                    start: formatDate(placement.startDate),
                    end: formatDate(placement.endDate),
                  })}
                </p>
              </div>
              <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>
                {t(`placements:statusValues.${placement.status}`)}
              </StatusBadge>
            </div>

            {/* Surfacing an unfilled supervisor post is the main thing staff act on from a list. */}
            {audience === 'staff' &&
              (placement.status === 'PLANNED' || placement.status === 'ACTIVE') &&
              (!placement.universitySupervisor || !placement.organizationSupervisor) && (
                <p className="mt-3 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
                  {t('placements:list.supervisorMissing')}
                </p>
              )}
            </Card>
          </li>
        )
        })}
      </ul>
    </section>
  )
}
