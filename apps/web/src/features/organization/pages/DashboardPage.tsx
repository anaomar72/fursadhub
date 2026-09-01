import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as opportunitiesApi from '../../opportunities/api/opportunityApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { DashboardActionCard, LoadingSpinner, PageHeader } from '../../../components/ui'

const ACTIVE_PLACEMENT_STATUSES = new Set(['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'])

/**
 * The organization's at-a-glance home (BRAND_AND_UI_GUIDELINES.md section 7): published
 * opportunities, drafts still awaiting publication, and active placements — composed from data
 * every other organization page already fetches.
 *
 * <p>Deliberately does not attempt an org-wide "candidate pipeline" or "offers awaiting response"
 * tile: candidates are only queryable per opportunity, and aggregating across every opportunity an
 * org has would mean N extra requests with no backing endpoint. Rather than approximate that with
 * a slow or misleading number, this dashboard shows only what a single existing list already
 * answers correctly.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()

  const opportunitiesQuery = useQuery({
    queryKey: ['organization', 'opportunities', organizationId],
    queryFn: () => opportunitiesApi.listOrganizationOpportunities(organizationId),
  })
  const placementsQuery = useQuery({
    queryKey: ['organization', 'placements', organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(organizationId),
  })

  const isLoading = opportunitiesQuery.isLoading || placementsQuery.isLoading

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const publishedOpportunities = (opportunitiesQuery.data ?? []).filter((o) => o.status === 'PUBLISHED').length
  const draftOpportunities = (opportunitiesQuery.data ?? []).filter((o) => o.status === 'DRAFT').length
  const activePlacements = (placementsQuery.data ?? []).filter((p) => ACTIVE_PLACEMENT_STATUSES.has(p.status)).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('organization:dashboard.title')} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardActionCard
          label={t('organization:dashboard.publishedOpportunities')}
          value={publishedOpportunities}
          to="/organization/opportunities"
          tone="info"
          statusLabel={t('organization:dashboard.live')}
        />
        <DashboardActionCard
          label={t('organization:dashboard.draftOpportunities')}
          value={draftOpportunities}
          to="/organization/opportunities"
          tone={draftOpportunities > 0 ? 'warning' : 'success'}
          statusLabel={draftOpportunities > 0 ? t('organization:dashboard.needsPublishing') : t('organization:dashboard.clear')}
        />
        <DashboardActionCard
          label={t('organization:dashboard.placements')}
          value={activePlacements}
          to="/organization/placements"
          tone="info"
          statusLabel={t('organization:dashboard.active')}
        />
      </div>
    </div>
  )
}
