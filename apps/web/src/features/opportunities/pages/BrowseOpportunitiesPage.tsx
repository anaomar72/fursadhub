import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import { useSavedOpportunityStatus } from '../../student/hooks/useSavedOpportunities'
import { StudentOpportunityCard } from '../../student/components/StudentOpportunityCard'
import type { WorkMode } from '../types'
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Pagination,
  PageHeader,
  SearchInput,
  Select,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

const WORK_MODES: WorkMode[] = ['ONSITE', 'HYBRID', 'REMOTE']
const PAGE_SIZE = 9

/**
 * Internship discovery inside the student shell — the student's primary action, and the reason
 * "Explore internships" is the second item in their sidebar.
 *
 * <p>The filters are exactly the four the API accepts: `query`, `location`, `workMode` and
 * `organization` ({@code PublicOpportunityController}). Discipline/department targeting, deadline
 * ranges and mode filters are NOT offered, because the endpoint cannot honour them and a control
 * that silently does nothing is worse than no control. `organization` is honoured when arriving
 * from an organization profile, but has no picker of its own for the same reason: there is no
 * organization-list endpoint behind one.
 *
 * <p>The endpoint only ever returns PUBLISHED, PUBLIC/HYBRID opportunities, so nothing shown here
 * is nomination-only or closed.
 */
export function BrowseOpportunitiesPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const organization = params.get('organization') ?? undefined

  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode | ''>('')
  const [page, setPage] = useState(0)

  const opportunitiesQuery = useQuery({
    queryKey: ['public-opportunities', 'browse', query, location, workMode, organization, page],
    queryFn: () =>
      publicOpportunityApi.listPublicOpportunities({
        query: query || undefined,
        location: location || undefined,
        workMode: workMode || undefined,
        organization,
        page,
        size: PAGE_SIZE,
      }),
  })

  // Marks the ones already in a pipeline, so the student is not invited to re-apply. The backend
  // rejects a duplicate with STUDENT_ALREADY_APPLIED regardless of what this renders.
  const candidaciesQuery = useQuery({
    queryKey: ['student', 'candidacies'],
    queryFn: recruitmentApi.listMyCandidacies,
    retry: false,
  })
  const appliedOpportunityIds = new Set((candidaciesQuery.data ?? []).map((candidacy) => candidacy.opportunityId))

  // Backend Phase B4. ONE request for the whole page of cards, not one per card — see
  // useSavedOpportunityStatus. A 9-card grid is a single call, and the hook chunks anything longer
  // to the server's 50-id bound.
  const savedStatus = useSavedOpportunityStatus((opportunitiesQuery.data?.content ?? []).map((item) => item.id))

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(0)
    }
  }

  const result = opportunitiesQuery.data

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('opportunities:browse.title')} description={t('opportunities:browse.subtitle')} />

      <FilterBar
        search={
          <SearchInput
            label={t('opportunities:public.searchLabel')}
            placeholder={t('opportunities:public.searchPlaceholder')}
            value={query}
            onChange={(event) => resetToFirstPage(setQuery)(event.target.value)}
          />
        }
      >
        <SearchInput
          label={t('opportunities:public.locationLabel')}
          placeholder={t('opportunities:public.locationPlaceholder')}
          value={location}
          onChange={(event) => resetToFirstPage(setLocation)(event.target.value)}
          className="sm:w-48"
        />
        <Select
          aria-label={t('opportunities:public.workModeLabel')}
          value={workMode}
          onChange={(event) => resetToFirstPage(setWorkMode)(event.target.value as WorkMode | '')}
          className="sm:w-44"
        >
          <option value="">{t('opportunities:public.allWorkModes')}</option>
          {WORK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`opportunities:workModeValues.${mode}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {opportunitiesQuery.isLoading ? (
        <LoadingState label={t('opportunities:public.loading')} />
      ) : opportunitiesQuery.isError ? (
        <ErrorState
          description={t('opportunities:public.error')}
          onRetry={() => void opportunitiesQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : result && result.content.length === 0 ? (
        <EmptyState title={t('opportunities:public.empty')} description={t('opportunities:browse.emptyHint')} />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('opportunities:browse.resultCount', { count: result?.totalElements ?? 0 })}
          </p>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result?.content.map((opportunity) => (
              <li key={opportunity.id} className="flex">
                <StudentOpportunityCard
                  opportunity={opportunity}
                  saved={savedStatus.isSaved(opportunity.id)}
                  bookmarkAvailable={!savedStatus.isUnavailable}
                  applied={appliedOpportunityIds.has(opportunity.id)}
                />
              </li>
            ))}
          </ul>
          {result && result.totalPages > 1 && (
            <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </PageContainer>
  )
}
