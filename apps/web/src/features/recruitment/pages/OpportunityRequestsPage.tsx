import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { universityQueries } from '../../university/universityQueries'
import { nominationDeadlinePassed, OPEN_TARGET_STATUSES, requestNeedsNominees } from '../../university/universityAttention'
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonList, StatusBadge } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import { OPPORTUNITY_TARGET_STATUS_TONE, toneOf } from '../../../lib/status/statusTones'
import type { TargetRequestResponse } from '../types'
import { NominationWorkflowNote } from '../components/NominationWorkflowNote'

/**
 * Published internships that target this university and ask it for nominees (CLAUDE.md sections
 * 32-35), Phase 7.
 *
 * <p>An institutional queue, not a marketplace: one row per request with who is asking, for which
 * departments, by when, and how many of the requested nominees are already put forward. Requests
 * still asking for nominees come first, nearest deadline first. The backend lists only PUBLISHED
 * opportunities ({@code NominationQueryService.listTargetRequests}), and a coordinator's
 * eligible-student list on the next page is narrowed to their own departments.
 */
export function OpportunityRequestsPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()

  const requestsQuery = useQuery(universityQueries.targetRequests(universityId))
  const departmentsQuery = useQuery(universityQueries.departments(universityId))
  const departmentNames = new Map((departmentsQuery.data ?? []).map((department) => [department.id, department.name]))

  const requests = [...(requestsQuery.data ?? [])].sort(
    (a, b) => Number(requestNeedsNominees(b)) - Number(requestNeedsNominees(a)) || a.nominationDeadline.localeCompare(b.nominationDeadline),
  )

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('recruitment:requests.title')} description={t('recruitment:requests.subtitle')} />

      <NominationWorkflowNote />

      {requestsQuery.isLoading ? (
        <SkeletonList rows={4} />
      ) : requestsQuery.isError ? (
        <ErrorState onRetry={() => void requestsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : requests.length === 0 ? (
        <EmptyState title={t('recruitment:requests.empty')} description={t('recruitment:requests.emptyHint')} />
      ) : (
        <>
          <p className="text-body text-foreground-secondary" aria-live="polite">
            {t('recruitment:requests.resultCount', { count: requests.length })}
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {requests.map((request) => (
              <RequestRow key={request.targetId} request={request} departmentNames={departmentNames} />
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  )
}

function RequestRow({ request, departmentNames }: { request: TargetRequestResponse; departmentNames: Map<string, string> }) {
  const { t } = useTranslation()
  const passed = nominationDeadlinePassed(request)
  const open = OPEN_TARGET_STATUSES.has(request.targetStatus)
  const departments = request.eligibleDepartmentIds.map((id) => departmentNames.get(id)).filter((name): name is string => !!name)
  const remaining = Math.max(request.requestedNominees - request.liveNominationCount, 0)

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0 flex-1">
        <h2 className="text-body font-semibold text-foreground">
          <Link
            to={`/university/opportunity-requests/${request.targetId}`}
            className="break-words rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {request.opportunityTitle}
          </Link>
        </h2>
        <p className="mt-0.5 break-words text-caption text-foreground-secondary">
          {request.organizationName} · {t('placements:detail.dateRange', { start: formatDate(request.startDate), end: formatDate(request.endDate) })}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge>{t(`opportunities:modeValues.${request.mode}`)}</Badge>
          {departments.length > 0 ? (
            departments.map((name) => <Badge key={name}>{name}</Badge>)
          ) : (
            <span className="text-caption text-foreground-secondary">{t('recruitment:requests.allDepartments')}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 sm:items-end sm:text-right">
        <StatusBadge tone={toneOf(OPPORTUNITY_TARGET_STATUS_TONE, request.targetStatus)}>{t(`recruitment:targetStatusValues.${request.targetStatus}`)}</StatusBadge>
        <span className="text-caption font-semibold text-foreground">
          {t('recruitment:requests.progress', { current: request.liveNominationCount, requested: request.requestedNominees })}
        </span>
        <span className="text-caption text-foreground-secondary">
          {passed ? t('recruitment:requests.deadlinePassed', { date: formatDate(request.nominationDeadline) }) : t('recruitment:requests.deadline', { deadline: formatDate(request.nominationDeadline) })}
        </span>
        {open && !passed && remaining > 0 && (
          <span className="text-caption text-foreground-secondary">{t('recruitment:requests.remaining', { count: remaining })}</span>
        )}
      </div>
    </li>
  )
}
