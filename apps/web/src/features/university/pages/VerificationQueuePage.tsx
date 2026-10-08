import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { universityQueries } from '../universityQueries'
import { REVIEWABLE_CASE_STATUSES } from '../universityAttention'
import { EmptyState, ErrorState, FilterBar, Icon, PageHeader, Select, SkeletonList, StatusBadge } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import { ENROLLMENT_VERIFICATION_TONE, toneOf } from '../../../lib/status/statusTones'

/** The case states a reviewer filters by. `OPEN` is the two reviewable states together. */
const FILTERS = ['OPEN', '', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_MORE_EVIDENCE', 'VERIFIED', 'REJECTED'] as const

/**
 * The student verification queue (CLAUDE.md sections 29-30), Phase 7.
 *
 * <p>The endpoint takes one optional `status`. "Needs review" is the default and covers BOTH states
 * a reviewer can act on (SUBMITTED, UNDER_REVIEW — {@code VerificationReviewService.requireReviewable}),
 * so it reads the unfiltered list and narrows it here; that list is the same cache entry the
 * dashboards use. Every other filter is sent to the server as-is. Reviewable cases are ordered
 * oldest submission first, so nobody waits longest unseen; the filter lives in the URL so the
 * dashboard can link straight to it.
 */
export function VerificationQueuePage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const [params, setParams] = useSearchParams()
  const requested = params.get('status') ?? 'OPEN'
  const filter = requested === 'ALL' ? '' : (FILTERS as readonly string[]).includes(requested) ? requested : 'OPEN'
  const serverStatus = filter === 'OPEN' ? '' : filter

  const queueQuery = useQuery(universityQueries.verificationCases(universityId, serverStatus))
  // Department NAMES for the rows: the case carries only an id, and the department is the scope
  // boundary a coordinator's whole role is defined by. A cache hit on most navigations.
  const departmentsQuery = useQuery(universityQueries.departments(universityId))
  const departmentNames = new Map((departmentsQuery.data ?? []).map((d) => [d.id, d.name]))

  const rows = (queueQuery.data ?? [])
    .filter((row) => filter !== 'OPEN' || REVIEWABLE_CASE_STATUSES.has(row.status))
    .sort((a, b) => {
      const reviewable = Number(REVIEWABLE_CASE_STATUSES.has(b.status)) - Number(REVIEWABLE_CASE_STATUSES.has(a.status))
      return reviewable || (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '')
    })

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('university:verificationQueue.title')} description={t('university:verificationQueue.subtitle')} />

      <FilterBar>
        <Select
          aria-label={t('university:verificationQueue.filterLabel')}
          className="sm:w-60"
          value={filter}
          onChange={(event) => setParams(event.target.value === 'OPEN' ? {} : { status: event.target.value || 'ALL' }, { replace: true })}
        >
          {FILTERS.map((value) => (
            <option key={value || 'ALL'} value={value}>
              {value === 'OPEN'
                ? t('university:verificationQueue.needsReview')
                : value === ''
                  ? t('university:verificationQueue.allStatuses')
                  : t(`university:students.statusValues.${value}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {queueQuery.isLoading ? (
        <SkeletonList rows={5} />
      ) : queueQuery.isError ? (
        <ErrorState title={t('common:status.error')} onRetry={() => void queueQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : rows.length === 0 ? (
        filter === 'OPEN' ? (
          <EmptyState title={t('university:verificationQueue.clearTitle')} description={t('university:verificationQueue.clearBody')} />
        ) : (
          <EmptyState title={t('university:verificationQueue.empty')} />
        )
      ) : (
        <>
          <p className="text-body text-foreground-secondary" aria-live="polite">
            {t('university:verificationQueue.resultCount', { count: rows.length })}
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {rows.map((row) => (
              <li key={row.id}>
                {/*
                  One row carries what a reviewer needs to triage without opening the case: who,
                  which department (their scope boundary), when it arrived, whether evidence is
                  attached, and the status. Every value comes from the case DTO; a missing field is
                  dropped rather than filled with a placeholder.
                */}
                <Link
                  to={`/university/verification-cases/${row.id}`}
                  className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-body font-semibold text-foreground">{row.studentFullName || row.studentEmail}</p>
                    <p className="mt-0.5 break-words text-caption text-foreground-secondary">
                      {[row.studentNumber, row.program, row.departmentId && departmentNames.get(row.departmentId)].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-foreground-secondary">
                      {row.submittedAt && <span>{t('university:verificationQueue.submittedOn', { date: formatDate(row.submittedAt) })}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Icon name={row.hasEvidence ? 'document' : 'alert'} className="size-3.5 shrink-0" />
                        {row.hasEvidence ? t('university:verificationQueue.evidenceAttached') : t('university:verificationQueue.noEvidence')}
                      </span>
                      {row.escalatedAt && <span>{t('university:verificationQueue.escalated')}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge tone={toneOf(ENROLLMENT_VERIFICATION_TONE, row.status)}>{t(`university:students.statusValues.${row.status}`)}</StatusBadge>
                    <Icon name="chevronRight" className="hidden size-4 text-foreground-secondary sm:block" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  )
}
