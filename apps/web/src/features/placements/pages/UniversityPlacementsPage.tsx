import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as placementsApi from '../api/placementsApi'
import { PlacementList } from '../components/PlacementList'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { ErrorState, LoadingState, PageHeader } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

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
    return <LoadingState label={t('common:status.loading')} />
  }

  if (placementsQuery.isError) {
    return (
      <ErrorState
        title={t('common:status.error')}
        onRetry={() => void placementsQuery.refetch()}
        retryLabel={t('common:actions.retry')}
      />
    )
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('placements:university.title')} description={t('placements:university.description')} />

      <PlacementList
        placements={placementsQuery.data ?? []}
        audience="staff"
        detailPath={(placement) => `/university/placements/${placement.id}`}
        emptyMessage={t('placements:university.empty')}
      />
    </PageContainer>
  )
}
