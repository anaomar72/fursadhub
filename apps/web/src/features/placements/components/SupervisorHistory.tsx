import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as placementsApi from '../api/placementsApi'
import { LoadingSpinner, StatusBadge } from '../../../components/ui'

interface SupervisorHistoryProps {
  placementId: string
}

/**
 * Every supervision period this placement has had, oldest first (CLAUDE.md section 40).
 *
 * <p>This panel is the visible payoff of modelling supervisors as append-only history: closed
 * periods are shown alongside the current one rather than disappearing on reassignment, so
 * "who supervised this student in March?" stays answerable after a handover.
 */
export function SupervisorHistory({ placementId }: SupervisorHistoryProps) {
  const { t } = useTranslation()

  const historyQuery = useQuery({
    queryKey: ['placements', 'supervisor-history', placementId],
    queryFn: () => placementsApi.listSupervisorHistory(placementId),
  })

  if (historyQuery.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner />
      </div>
    )
  }

  const history = historyQuery.data ?? []
  if (history.length === 0) {
    return null
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{t('placements:history.title')}</h2>
      <p className="mt-1 text-xs text-foreground-secondary">{t('placements:history.description')}</p>

      <ul className="mt-4 flex flex-col gap-3">
        {history.map((assignment) => (
          <li
            key={assignment.id}
            className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
          >
            <div>
              <p className="text-sm text-foreground">
                {assignment.supervisorEmail ?? assignment.supervisorUserId}
              </p>
              <p className="mt-0.5 text-xs text-foreground-secondary">
                {t(`placements:supervisors.typeValues.${assignment.type}`)}
                {' · '}
                {assignment.removedAt
                  ? t('placements:history.period', {
                      start: assignment.assignedAt.slice(0, 10),
                      end: assignment.removedAt.slice(0, 10),
                    })
                  : t('placements:history.since', { start: assignment.assignedAt.slice(0, 10) })}
              </p>
            </div>
            <StatusBadge tone={assignment.active ? 'success' : 'neutral'}>
              {t(assignment.active ? 'placements:history.current' : 'placements:history.past')}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </section>
  )
}
