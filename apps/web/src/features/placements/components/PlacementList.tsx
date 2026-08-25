import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../../components/ui'
import { PLACEMENT_STATUS_TONE } from './statusTone'
import type { PlacementResponse } from '../types'

interface PlacementListProps {
  placements: PlacementResponse[]
  /** Builds the detail link for the area this list is rendered in. */
  detailPath: (placement: PlacementResponse) => string
  /** Students see the opportunity; staff need to know which student each row is. */
  audience: 'student' | 'staff'
  emptyMessage: string
}

/**
 * The shared placement list used by the student, university and organization areas, so the same
 * placement reads identically wherever it appears (BRAND_AND_UI_GUIDELINES.md section 17).
 *
 * <p>This component never filters: what arrives has already been scoped by the backend query for
 * the caller's real role, and re-filtering here would imply the UI is part of the boundary. It is
 * not (CLAUDE.md section 24).
 */
export function PlacementList({ placements, detailPath, audience, emptyMessage }: PlacementListProps) {
  const { t } = useTranslation()

  if (placements.length === 0) {
    return <p className="mt-8 text-center text-sm text-foreground-secondary">{emptyMessage}</p>
  }

  return (
    <ul className="mt-6 flex flex-col gap-3">
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
          <li key={placement.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to={detailPath(placement)} className="font-medium text-foreground hover:underline">
                  {primary}
                </Link>
                {secondary && <p className="mt-1 text-xs text-foreground-secondary">{secondary}</p>}
                <p className="mt-1 text-xs text-foreground-secondary">
                  {t('placements:detail.dateRange', {
                    start: placement.startDate,
                    end: placement.endDate,
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
          </li>
        )
      })}
    </ul>
  )
}
