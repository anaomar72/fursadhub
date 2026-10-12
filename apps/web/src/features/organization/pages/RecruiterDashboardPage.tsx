import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as opportunityApi from '../../opportunities/api/opportunityApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { useOrganizationCandidates } from '../hooks/useOrganizationCandidates'
import { allCandidates } from '../organizationMetrics'
import { liveOffers, needsAttention, opportunityLoad } from '../recruiterMetrics'
import { recruitingAttention } from '../organizationAttention'
import {
  CandidateQueue,
  InternshipLoad,
  OrganizationAttentionQueue,
  PipelineStages,
} from '../components/workspace/OrganizationWorkspace'
import { Alert, ButtonLink, ErrorState, Icon, PageHeader, Panel, SkeletonList } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

const QUEUE_LIMIT = 6

/**
 * The recruiter's workspace (Phase 6) — recruitment, in the order a recruiter works it: what is
 * waiting, where the pipeline stands, who to look at next, which offers are out, and how each
 * internship is filling. No organization administration (a recruiter has none) and no supervision.
 *
 * <p>The header renders at once; every block loads and fails on its own. All candidate figures come
 * from the same per-internship pools the candidate pages read (useOrganizationCandidates).
 */
export function RecruiterDashboardPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'organization', organizationId],
    queryFn: () => opportunityApi.listOrganizationOpportunities(organizationId),
    retry: false,
  })
  const pools = useOrganizationCandidates(opportunitiesQuery.data ?? [], opportunitiesQuery.isSuccess)
  const ready = opportunitiesQuery.isSuccess && !pools.isLoading
  const candidates = allCandidates(pools.rows)
  const offers = ready ? liveOffers(pools.rows, 5) : []

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        title={t('organization:recruiterDashboard.title')}
        description={t('organization:recruiterDashboard.subtitle')}
        actions={
          <ButtonLink to="/organization/opportunities/new">
            <Icon name="plus" className="size-4" />
            {t('opportunities:list.create')}
          </ButtonLink>
        }
      />

      {opportunitiesQuery.isError ? (
        <ErrorState variant="inline" onRetry={() => void opportunitiesQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : ready ? (
        <OrganizationAttentionQueue items={recruitingAttention(candidates)} />
      ) : (
        <SkeletonList rows={2} />
      )}

      {!opportunitiesQuery.isError && (
        <PipelineStages
          candidates={candidates}
          loading={!ready}
          scope={ready ? t('organization:workspace.work.pipelineScope', { count: pools.totalInScope }) : undefined}
        />
      )}

      {pools.hasErrors && <Alert tone="warning">{t('organization:workspace.work.partialError')}</Alert>}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <CandidateQueue rows={ready ? needsAttention(pools.rows, QUEUE_LIMIT) : []} loading={!ready && !opportunitiesQuery.isError} />

        <div className="flex min-w-0 flex-col gap-8">
          <Panel title={t('organization:workspace.work.offersTitle')} padding={!ready || offers.length === 0 ? 'compact' : 'none'}>
            {!ready ? (
              <SkeletonList rows={2} />
            ) : offers.length === 0 ? (
              <p className="text-body text-foreground-secondary">{t('organization:workspace.work.offersEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {offers.map(({ candidate, opportunityTitle }) => (
                  <li key={candidate.candidacyId} className="px-4 py-3">
                    <Link
                      to={`/organization/candidacies/${candidate.candidacyId}`}
                      className="block break-words rounded-sm text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
                    </Link>
                    <span className="mt-0.5 block break-words text-caption text-foreground-secondary">
                      {opportunityTitle}
                      {candidate.liveOffer?.responseDeadline && (
                        <> · {t('organization:workspace.work.offerDeadline', { date: formatDate(candidate.liveOffer.responseDeadline) })}</>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <InternshipLoad rows={ready ? opportunityLoad(pools.rows) : []} loading={!ready && !opportunitiesQuery.isError} />
        </div>
      </div>
    </PageContainer>
  )
}
