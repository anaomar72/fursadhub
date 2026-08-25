import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as placementsApi from '../api/placementsApi'
import { PlacementList } from '../components/PlacementList'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { LoadingSpinner } from '../../../components/ui'

/**
 * The university's view of its students' placements (CLAUDE.md section 25).
 *
 * <p>What arrives here is already narrowed by the backend to the caller's real scope — an admin's
 * whole university, a coordinator's assigned departments, a supervisor's own assignments. This page
 * deliberately does no filtering of its own: department isolation is a backend boundary, and
 * re-implementing it here would suggest the UI is part of it.
 */
export function UniversityPlacementsPage() {
  const { t } = useTranslation()
  const membership = useUniversityMembership()

  const placementsQuery = useQuery({
    queryKey: ['placements', 'university', membership.universityId],
    queryFn: () => placementsApi.listUniversityPlacements(membership.universityId),
  })

  if (placementsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('placements:university.title')}</h1>
      <p className="mt-1 text-sm text-foreground-secondary">
        {t('placements:university.description')}
      </p>

      <PlacementList
        placements={placementsQuery.data ?? []}
        audience="staff"
        detailPath={(placement) => `/university/placements/${placement.id}`}
        emptyMessage={t('placements:university.empty')}
      />
    </div>
  )
}
