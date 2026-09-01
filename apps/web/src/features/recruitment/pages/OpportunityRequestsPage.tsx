import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { EmptyState, LoadingSpinner, PageHeader, StatusBadge } from '../../../components/ui'

/**
 * Published opportunities targeting this university, awaiting nominations
 * (CLAUDE.md Phase 4 section 26).
 */
export function OpportunityRequestsPage() {
  const { t } = useTranslation()
  const membership = useUniversityMembership()

  const requestsQuery = useQuery({
    queryKey: ['recruitment', 'target-requests', membership.universityId],
    queryFn: () => recruitmentApi.listTargetRequests(membership.universityId),
  })

  if (requestsQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const requests = requestsQuery.data ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('recruitment:requests.title')} />

      {requests.length === 0 ? (
        <EmptyState className="mt-8" title={t('recruitment:requests.empty')} />
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {requests.map((request) => (
            <li key={request.targetId} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/university/opportunity-requests/${request.targetId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {request.opportunityTitle}
                  </Link>
                  <p className="mt-1 text-sm text-foreground-secondary">{request.organizationName}</p>
                </div>
                <StatusBadge tone="info">
                  {t('recruitment:requests.progress', {
                    current: request.liveNominationCount,
                    requested: request.requestedNominees,
                  })}
                </StatusBadge>
              </div>

              <p className="mt-3 text-xs text-foreground-secondary">
                {t('recruitment:requests.deadline', { deadline: request.nominationDeadline })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
