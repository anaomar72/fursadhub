import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  ProgressIndicator,
  StatusBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

/**
 * Published opportunities targeting this university, awaiting nominations
 * (CLAUDE.md Phase 4 section 26).
 *
 * <p>The sourcing mode is shown as it really is — a `UNIVERSITY_TARGETED` opportunity sources
 * candidates only through nominations, while a `HYBRID` one also takes direct applications — so
 * staff can see why a request exists rather than treating every row as the same thing.
 */
export function OpportunityRequestsPage() {
  const { t } = useTranslation()
  const membership = useUniversityMembership()

  const requestsQuery = useQuery({
    queryKey: ['university', 'target-requests', membership.universityId],
    queryFn: () => recruitmentApi.listTargetRequests(membership.universityId),
  })

  const requests = requestsQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('recruitment:requests.title')} description={t('recruitment:requests.subtitle')} />

      {requestsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : requestsQuery.isError ? (
        <ErrorState onRetry={() => void requestsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : requests.length === 0 ? (
        <EmptyState title={t('recruitment:requests.empty')} description={t('recruitment:requests.emptyHint')} />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {requests.map((request) => {
            const filled = request.requestedNominees === 0 ? 0 : Math.round((request.liveNominationCount / request.requestedNominees) * 100)
            return (
              <li key={request.targetId} className="flex">
                <Card interactive padding="lg" className="relative flex w-full flex-col">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                      <Icon name="briefcase" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold text-foreground">
                        <Link
                          to={`/university/opportunity-requests/${request.targetId}`}
                          className="focus-visible:outline-none focus-visible:underline after:absolute after:inset-0"
                        >
                          {request.opportunityTitle}
                        </Link>
                      </h2>
                      <p className="mt-0.5 truncate text-sm text-foreground-secondary">{request.organizationName}</p>
                    </div>
                    <StatusBadge tone={request.targetStatus === 'COMPLETED' ? 'success' : 'info'}>
                      {t(`recruitment:targetStatusValues.${request.targetStatus}`)}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{t(`opportunities:modeValues.${request.mode}`)}</Badge>
                    <Badge>
                      {t('recruitment:requests.deadline', { deadline: formatDate(request.nominationDeadline) })}
                    </Badge>
                  </div>

                  <ProgressIndicator
                    className="mt-4"
                    label={t('recruitment:requests.progress', {
                      current: request.liveNominationCount,
                      requested: request.requestedNominees,
                    })}
                    value={filled}
                    showValue={false}
                  />
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </PageContainer>
  )
}
