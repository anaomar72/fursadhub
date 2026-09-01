import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { DashboardActionCard, LoadingSpinner, PageHeader } from '../../../components/ui'

const OPEN_CASE_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW'])
const OPEN_TARGET_STATUSES = new Set(['REQUESTED', 'ACKNOWLEDGED', 'NOMINATING'])
const ACTIVE_PLACEMENT_STATUSES = new Set(['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'])

/**
 * The university's at-a-glance home (BRAND_AND_UI_GUIDELINES.md section 7): the student
 * verification queue, opportunity requests awaiting nomination, nominations awaiting student
 * consent, and active placements — composed entirely from data every other university page
 * already fetches.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()

  const queueQuery = useQuery({
    queryKey: ['university', 'verification-queue', universityId],
    queryFn: () => universityApi.listVerificationQueue(universityId),
  })
  const requestsQuery = useQuery({
    queryKey: ['university', 'target-requests', universityId],
    queryFn: () => recruitmentApi.listTargetRequests(universityId),
  })
  const nominationsQuery = useQuery({
    queryKey: ['university', 'nominations', universityId],
    queryFn: () => recruitmentApi.listUniversityNominations(universityId),
  })
  const placementsQuery = useQuery({
    queryKey: ['university', 'placements', universityId],
    queryFn: () => placementsApi.listUniversityPlacements(universityId),
  })

  const isLoading = queueQuery.isLoading || requestsQuery.isLoading || nominationsQuery.isLoading || placementsQuery.isLoading

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const openCases = (queueQuery.data ?? []).filter((c) => OPEN_CASE_STATUSES.has(c.status)).length
  const openRequests = (requestsQuery.data ?? []).filter((r) => OPEN_TARGET_STATUSES.has(r.targetStatus)).length
  const pendingNominations = (nominationsQuery.data ?? []).filter((n) => n.status === 'PENDING_STUDENT_CONSENT').length
  const activePlacements = (placementsQuery.data ?? []).filter((p) => ACTIVE_PLACEMENT_STATUSES.has(p.status)).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('university:dashboard.title')} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardActionCard
          label={t('university:dashboard.verificationQueue')}
          value={openCases}
          to="/university/verification-cases"
          tone={openCases > 0 ? 'warning' : 'success'}
          statusLabel={openCases > 0 ? t('university:dashboard.needsAction') : t('university:dashboard.clear')}
        />
        <DashboardActionCard
          label={t('university:dashboard.opportunityRequests')}
          value={openRequests}
          to="/university/opportunity-requests"
          tone={openRequests > 0 ? 'warning' : 'success'}
          statusLabel={openRequests > 0 ? t('university:dashboard.needsAction') : t('university:dashboard.clear')}
        />
        <DashboardActionCard
          label={t('university:dashboard.nominations')}
          value={pendingNominations}
          to="/university/nominations"
          tone="info"
          statusLabel={t('university:dashboard.awaitingStudent')}
        />
        <DashboardActionCard
          label={t('university:dashboard.placements')}
          value={activePlacements}
          to="/university/placements"
          tone="info"
          statusLabel={t('university:dashboard.active')}
        />
      </div>
    </div>
  )
}
