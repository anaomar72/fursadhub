import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as studentApi from '../api/studentApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import { SAVED_LIST_KEY } from '../hooks/useSavedOpportunities'
import { StudentOpportunityCard } from '../components/StudentOpportunityCard'
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import { ApiError } from '../../../lib/api/client'

const PAGE_SIZE = 12

/**
 * The student's Saved Internships (Backend Phase B4).
 *
 * <p>No saved-status batch call is made here: every row on this page is saved by definition — that
 * is what the endpoint returns — so asking which of them are saved would be a wasted request.
 *
 * <p><strong>The list is what the server says is visible, and nothing more.</strong> A bookmark
 * whose internship has stopped being publicly discoverable (closed, or its organization's
 * verification revoked) stays persisted server-side but is absent from this response, and the totals
 * describe the visible set. This page renders exactly that: it does not fabricate a "no longer
 * available" placeholder row for a bookmark it cannot see, and it has no way to reach past public
 * visibility to display one. If the internship becomes public again it reappears on its own.
 */
export function SavedInternshipsPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)

  const savedQuery = useQuery({
    queryKey: [...SAVED_LIST_KEY, page],
    queryFn: () => studentApi.listSavedOpportunities({ page, size: PAGE_SIZE }),
    retry: false,
  })

  // Same marker as discovery, from the student's own candidacy list.
  const candidaciesQuery = useQuery({
    queryKey: ['student', 'candidacies'],
    queryFn: recruitmentApi.listMyCandidacies,
    retry: false,
  })
  const appliedOpportunityIds = new Set((candidaciesQuery.data ?? []).map((candidacy) => candidacy.opportunityId))

  const result = savedQuery.data

  /*
   * A student profile is OPTIONAL: `StudentEnrollmentService` never creates or requires one, so a
   * student can enrol, reach VERIFIED and browse the marketplace without ever saving profile
   * details. `SavedOpportunityService` is keyed on the profile, so for those students this endpoint
   * answers 404 STUDENT_PROFILE_NOT_FOUND.
   *
   * That is not a failure, and rendering it as one was a live defect: the page told a perfectly
   * healthy account "Something went wrong". Nothing went wrong — saving requires a profile, so a
   * student without one has provably saved nothing, and the truthful rendering is the empty state
   * with a hint naming the actual prerequisite. Every other error still surfaces as an error.
   */
  const noProfileYet =
    savedQuery.error instanceof ApiError && savedQuery.error.body.code === 'STUDENT_PROFILE_NOT_FOUND'

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('student:saved.title')} description={t('student:saved.subtitle')} />

      {savedQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : savedQuery.isError && !noProfileYet ? (
        <ErrorState
          description={t('student:saved.error')}
          onRetry={() => void savedQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : noProfileYet ? (
        <EmptyState
          title={t('student:saved.empty')}
          description={t('student:saved.emptyNeedsProfile')}
          action={
            <Link
              to="/student/profile"
              className="inline-flex h-10 items-center rounded-lg bg-action-primary px-4 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('student:saved.completeProfile')}
            </Link>
          }
        />
      ) : !result || result.content.length === 0 ? (
        <EmptyState
          title={t('student:saved.empty')}
          description={t('student:saved.emptyHint')}
          action={
            <Link
              to="/student/opportunities"
              className="inline-flex h-10 items-center rounded-lg bg-action-primary px-4 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('student:nav.exploreInternships')}
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('student:saved.resultCount', { count: result.totalElements })}
          </p>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.content.map((entry) => (
              <li key={entry.opportunity.id} className="flex">
                <StudentOpportunityCard
                  opportunity={entry.opportunity}
                  saved
                  applied={appliedOpportunityIds.has(entry.opportunity.id)}
                  footer={t('student:saved.savedOn', { date: formatDate(entry.savedAt) })}
                />
              </li>
            ))}
          </ul>
          {result.totalPages > 1 && (
            <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </PageContainer>
  )
}
