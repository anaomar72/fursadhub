import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../../components/ui'
import { PLACEMENT_STATUS_TONE } from './statusTone'
import type { PlacementResponse } from '../types'

interface PlacementSummaryProps {
  placement: PlacementResponse
  /** Students already know who they are; staff screens lead with the student instead. */
  audience: 'student' | 'staff'
}

/**
 * The shared placement header: who, where, when, and the current state.
 *
 * <p>The academic context shown here is the placement's OWN university/department, which is why a
 * completed placement keeps reporting the department the student actually served it under even
 * after they transfer (CLAUDE.md section 39).
 */
export function PlacementSummary({ placement, audience }: PlacementSummaryProps) {
  const { t } = useTranslation()

  const heading =
    audience === 'student'
      ? (placement.opportunityTitle ?? t('placements:detail.untitledOpportunity'))
      : (placement.studentFullName ?? placement.studentEmail ?? placement.studentUserId)

  const subheading =
    audience === 'student'
      ? placement.organizationName
      : (placement.opportunityTitle ?? t('placements:detail.untitledOpportunity'))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
          {subheading && <p className="mt-1 text-sm text-foreground-secondary">{subheading}</p>}
        </div>
        <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>
          {t(`placements:statusValues.${placement.status}`)}
        </StatusBadge>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-foreground-secondary">{t('placements:detail.dates')}</dt>
          <dd className="mt-0.5 text-foreground">
            {t('placements:detail.dateRange', { start: placement.startDate, end: placement.endDate })}
          </dd>
        </div>

        {placement.location && (
          <div>
            <dt className="text-foreground-secondary">{t('placements:detail.location')}</dt>
            <dd className="mt-0.5 text-foreground">{placement.location}</dd>
          </div>
        )}

        {audience === 'staff' && placement.organizationName && (
          <div>
            <dt className="text-foreground-secondary">{t('placements:detail.organization')}</dt>
            <dd className="mt-0.5 text-foreground">{placement.organizationName}</dd>
          </div>
        )}

        {placement.universityName && (
          <div>
            <dt className="text-foreground-secondary">{t('placements:detail.university')}</dt>
            <dd className="mt-0.5 text-foreground">{placement.universityName}</dd>
          </div>
        )}

        {placement.departmentName && (
          <div>
            <dt className="text-foreground-secondary">{t('placements:detail.department')}</dt>
            <dd className="mt-0.5 text-foreground">{placement.departmentName}</dd>
          </div>
        )}
      </dl>

      {/*
        The reason a placement ended is shown with the state that produced it, never merged into a
        generic "ended" note — cancelling and terminating mean different things.
      */}
      {placement.status === 'CANCELLED' && placement.cancellationReason && (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground-secondary">
          {t('placements:detail.cancellationReason', { reason: placement.cancellationReason })}
        </p>
      )}
      {placement.status === 'TERMINATED' && placement.terminationReason && (
        <p className="mt-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {t('placements:detail.terminationReason', { reason: placement.terminationReason })}
        </p>
      )}
    </div>
  )
}
