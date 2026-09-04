import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import * as recruitmentApi from '../../recruitment/api/recruitmentApi'
import type { WorkMode } from '../types'
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  FilterBar,
  Icon,
  LoadingState,
  Pagination,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

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
                <Card
                  interactive
                  padding="lg"
                  className="relative flex w-full flex-col focus-within:border-brand-primary"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info">
                      <Icon name="briefcase" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 font-semibold text-foreground">
                        <Link
                          to={`/student/opportunities/${opportunity.id}`}
                          className="focus-visible:outline-none focus-visible:underline after:absolute after:inset-0"
                        >
                          {opportunity.title}
                        </Link>
                      </h2>
                      <p className="mt-0.5 truncate text-sm text-foreground-secondary">
                        {opportunity.organization.name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{t(`opportunities:workModeValues.${opportunity.workMode}`)}</Badge>
                    {opportunity.location && <Badge>{opportunity.location}</Badge>}
                    {appliedOpportunityIds.has(opportunity.id) && (
                      <StatusBadge tone="info">{t('opportunities:browse.applied')}</StatusBadge>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-foreground-secondary">{opportunity.description}</p>

                  <p className="mt-auto pt-4 text-xs text-muted">
                    {opportunity.applicationDeadline
                      ? t('opportunities:browse.deadline', { date: formatDate(opportunity.applicationDeadline) })
                      : t('opportunities:browse.startsOn', { date: formatDate(opportunity.startDate) })}
                  </p>
                </Card>
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
