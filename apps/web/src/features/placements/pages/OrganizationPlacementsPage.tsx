import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as placementsApi from '../api/placementsApi'
import { PlacementList } from '../components/PlacementList'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { LoadingSpinner, PageHeader } from '../../../components/ui'

/**
 * The organization's placements (CLAUDE.md section 26).
 *
 * <p>The organization id comes from the caller's resolved membership rather than anything typed
 * into the URL, and the backend re-checks that membership on every request — an
 * {@code ORGANIZATION_SUPERVISOR} receives only the placements they are assigned to, without this
 * page having to filter anything itself.
 */
export function OrganizationPlacementsPage() {
  const { t } = useTranslation()
  const membership = useOrganizationMembership()

  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', membership.organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(membership.organizationId),
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
      <PageHeader title={t('placements:organization.title')} description={t('placements:organization.description')} />

      <PlacementList
        placements={placementsQuery.data ?? []}
        audience="staff"
        detailPath={(placement) => `/organization/placements/${placement.id}`}
        emptyMessage={t('placements:organization.empty')}
      />
    </div>
  )
}
