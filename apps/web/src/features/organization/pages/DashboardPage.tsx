import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as opportunityApi from '../../opportunities/api/opportunityApi'
import * as organizationApi from '../api/organizationApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { InstitutionVerificationCue } from '../../../components/verification/InstitutionVerificationCue'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { organizationCapabilities } from '../organizationCapabilities'
import { RecruiterDashboardPage } from './RecruiterDashboardPage'
import { SupervisorDashboardPage } from './SupervisorDashboardPage'
import { useOrganizationCandidates } from '../hooks/useOrganizationCandidates'
import { activeOpportunityCount, allCandidates, currentInternCount } from '../organizationMetrics'
import { needsAttention, opportunityLoad } from '../recruiterMetrics'
import { adminAttention } from '../organizationAttention'
import {
  CandidateQueue,
  InternshipLoad,
  OrganizationAttentionQueue,
  WorkspaceMetrics,
} from '../components/workspace/OrganizationWorkspace'
import { Alert, ButtonLink, ErrorState, Icon, PageHeader, SkeletonList } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

const QUEUE_LIMIT = 6

/**
 * The organization's home. Each role gets its own workspace rather than one page with controls
 * hidden: a recruiter recruits, a supervisor supervises, and the admin runs the organization.
 */
export function DashboardPage() {
  const membership = useOrganizationMembership()
  const can = organizationCapabilities(membership)
  if (can.isRecruiter) return <RecruiterDashboardPage />
  if (can.scopedToAssignedPlacements) return <SupervisorDashboardPage />
  return <AdminDashboard />
}

/**
 * The organization admin's workspace (Phase 6): attention → recruiting at a glance → the one work
 * list that matters most (candidates waiting on the organization) → secondary context.
 *
 * <p>Verification appears once, as the Phase 4 cue, and only while the organization is unverified.
 *
 * <p><strong>Loading.</strong> The header renders at once and each block loads on its own: the
 * attention queue waits for the records it counts, each figure shows a dash until its own source
 * arrives, and a failed source is an inline error in its own block — the verification cue and the
 * header never depend on candidate data. Requests are the same ones the opportunity and candidate
 * pages make, under the same keys.
 */
function AdminDashboard() {
  const { t } = useTranslation()
  const membership = useOrganizationMembership()
  const { organizationId } = membership
  const can = organizationCapabilities(membership)

  const organizationQuery = useQuery({
    queryKey: ['organization', 'detail', organizationId],
    queryFn: () => organizationApi.getOrganization(organizationId),
    enabled: can.canEditProfile,
    retry: false,
  })
  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'organization', organizationId],
    queryFn: () => opportunityApi.listOrganizationOpportunities(organizationId),
    retry: false,
  })
  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(organizationId),
    retry: false,
  })

  const opportunities = opportunitiesQuery.data ?? []
  const placements = placementsQuery.data ?? []
  const pools = useOrganizationCandidates(opportunities, can.canManageCandidates && opportunitiesQuery.isSuccess)
  const candidates = allCandidates(pools.rows)
  const candidatesReady = opportunitiesQuery.isSuccess && !pools.isLoading

  const attentionReady = candidatesReady && placementsQuery.isSuccess
  const attentionFailed = opportunitiesQuery.isError || placementsQuery.isError
  const verified = organizationQuery.data?.verificationStatus === 'VERIFIED'

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        title={t('organization:dashboard.title')}
        description={t('organization:dashboard.subtitle')}
        actions={
          can.canManageOpportunities && (
            <ButtonLink to="/organization/opportunities/new">
              <Icon name="plus" className="size-4" />
              {t('opportunities:list.create')}
            </ButtonLink>
          )
        }
      />

      <InstitutionVerificationCue namespace="organization" status={organizationQuery.data?.verificationStatus} to="/organization/profile" />

      {attentionFailed ? (
        <ErrorState
          variant="inline"
          onRetry={() => {
            if (opportunitiesQuery.isError) void opportunitiesQuery.refetch()
            if (placementsQuery.isError) void placementsQuery.refetch()
          }}
          retryLabel={t('common:actions.retry')}
        />
      ) : attentionReady ? (
        <OrganizationAttentionQueue items={adminAttention({ candidates, placements, opportunities, verified })} />
      ) : (
        <SkeletonList rows={2} />
      )}

      <WorkspaceMetrics
        metrics={[
          {
            id: 'recruiting',
            label: t('organization:workspace.metrics.recruiting'),
            value: opportunitiesQuery.isSuccess ? activeOpportunityCount(opportunities) : undefined,
            to: '/organization/opportunities',
          },
          {
            id: 'awaitingReview',
            label: t('organization:workspace.metrics.awaitingReview'),
            value: candidatesReady ? needsAttention(pools.rows, Number.MAX_SAFE_INTEGER).length : undefined,
            to: '/organization/candidates',
          },
          {
            id: 'offersOut',
            label: t('organization:workspace.metrics.offersOut'),
            value: candidatesReady ? candidates.filter((candidate) => candidate.status === 'OFFERED').length : undefined,
            to: '/organization/candidates?stage=OFFERED',
          },
          {
            id: 'currentInterns',
            label: t('organization:workspace.metrics.currentInterns'),
            value: placementsQuery.isSuccess ? currentInternCount(placements) : undefined,
            to: '/organization/placements',
          },
        ]}
      />

      {pools.hasErrors && <Alert tone="warning">{t('organization:workspace.work.partialError')}</Alert>}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <CandidateQueue rows={candidatesReady ? needsAttention(pools.rows, QUEUE_LIMIT) : []} loading={!candidatesReady && !opportunitiesQuery.isError} />
        <InternshipLoad rows={candidatesReady ? opportunityLoad(pools.rows) : []} loading={!candidatesReady && !opportunitiesQuery.isError} />
      </div>
    </PageContainer>
  )
}
