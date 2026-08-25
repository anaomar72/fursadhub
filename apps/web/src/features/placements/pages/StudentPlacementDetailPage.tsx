import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as placementsApi from '../api/placementsApi'
import { PlacementSummary } from '../components/PlacementSummary'
import { LoadingSpinner } from '../../../components/ui'

/**
 * The student's view of one of their own internships.
 *
 * <p>Read-only by design. The student owns the placement but does not drive its lifecycle — the
 * hosting organization does — so there are no command buttons here, matching the backend, which
 * refuses those commands from a student account regardless of what the UI renders.
 *
 * <p>Supervisors are shown as information: the student should know who is responsible for them on
 * each side, without being able to change either assignment.
 */
export function StudentPlacementDetailPage() {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()

  const placementQuery = useQuery({
    queryKey: ['placements', 'mine', placementId],
    queryFn: () => placementsApi.getMyPlacement(placementId!),
    enabled: !!placementId,
  })

  if (placementQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const placement = placementQuery.data
  if (!placement) {
    return (
      <p className="px-4 py-10 text-center text-sm text-foreground-secondary">
        {t('placements:detail.notFound')}
      </p>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PlacementSummary placement={placement} audience="student" />

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">{t('placements:supervisors.title')}</h2>
        <dl className="mt-3 flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-foreground-secondary">
              {t('placements:supervisors.universitySupervisor')}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {placement.universitySupervisor?.supervisorEmail ??
                t('placements:supervisors.unassigned')}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-secondary">
              {t('placements:supervisors.organizationSupervisor')}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {placement.organizationSupervisor?.supervisorEmail ??
                t('placements:supervisors.unassigned')}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
