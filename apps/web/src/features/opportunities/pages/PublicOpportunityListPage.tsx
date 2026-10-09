import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import type { WorkMode } from '../types'
import { Button, EmptyState, ErrorState, Icon, Input, Pagination, Reveal, SearchInput, Select } from '../../../components/ui'
import { PublicContainer } from '../../../app/layouts/PublicContainer'
import { PublicBookmarks } from '../../student/components/PublicBookmarks'
import { OPPORTUNITY_GRID, OpportunityGridSkeleton, PublicOpportunityCard } from '../components/PublicOpportunityCard'

const WORK_MODES: WorkMode[] = ['ONSITE', 'HYBRID', 'REMOTE']
const PAGE_SIZE = 12

/**
 * The public internships marketplace.
 *
 * <p><strong>Filtering is server-side and URL-driven</strong>, exactly as before: keyword, location
 * and work mode are sent to `GET /public/opportunities`, and the URL is the source of truth for what
 * is applied — so the home page's hero search and a shared link both land on the same results. No
 * filter is offered that the endpoint does not support.
 *
 * <p>What changed is the composition. The page used to open with a second marketing hero, a stock
 * photograph and invented "popular" English search terms, then put a promotional rail beside the
 * results that pointed anonymous visitors at signed-in portal routes. It now opens with the page's
 * name and a single filter toolbar, and gives the results the full width: the results ARE the page.
 *
 * <p>The page header and toolbar never unmount while results load or refetch — only the results
 * region changes, through card-shaped skeletons — so applying a filter does not blank the page.
 */
export function PublicOpportunityListPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()

  const organization = params.get('organization') ?? undefined
  const appliedQuery = params.get('query') ?? ''
  const appliedLocation = params.get('location') ?? ''
  const appliedWorkMode = (params.get('workMode') as WorkMode | null) ?? ''
  const [query, setQuery] = useState(appliedQuery)
  const [location, setLocation] = useState(appliedLocation)
  const [workMode, setWorkMode] = useState<WorkMode | ''>(appliedWorkMode)
  const filtered = Boolean(appliedQuery || appliedLocation || appliedWorkMode)

  // Paging is scoped to the filters it was chosen under, so changing a filter starts at page 1
  // without an effect that renders once on the stale page first.
  const filterKey = [appliedQuery, appliedLocation, appliedWorkMode, organization ?? ''].join('|')
  const [paging, setPaging] = useState({ key: filterKey, page: 0 })
  const page = paging.key === filterKey ? paging.page : 0
  const setPage = (next: number) => setPaging({ key: filterKey, page: next })

  const result = useQuery({
    queryKey: ['public-opportunities', appliedQuery, appliedLocation, appliedWorkMode, organization, page],
    queryFn: () =>
      publicOpportunityApi.listPublicOpportunities({
        query: appliedQuery || undefined,
        location: appliedLocation || undefined,
        workMode: appliedWorkMode || undefined,
        organization,
        page,
        size: PAGE_SIZE,
      }),
  })

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (organization) next.set('organization', organization)
    if (query.trim()) next.set('query', query.trim())
    if (location.trim()) next.set('location', location.trim())
    if (workMode) next.set('workMode', workMode)
    setParams(next)
  }

  function clearFilters() {
    setQuery('')
    setLocation('')
    setWorkMode('')
    const next = new URLSearchParams()
    if (organization) next.set('organization', organization)
    setParams(next)
  }

  const total = result.data?.totalElements ?? 0
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(total, (page + 1) * PAGE_SIZE)

  return (
    <PublicBookmarks ids={result.data?.content.map((item) => item.id) ?? []}>
      <div className="bg-background">
        <section className="border-b border-border bg-surface">
          <PublicContainer className="py-10 lg:py-14">
            <h1 className="font-display text-display-lg text-foreground">{t('opportunities:public.browseTitle')}</h1>
            <p className="mt-2 max-w-2xl text-body-lg text-foreground-secondary">{t('opportunities:public.browseDescription')}</p>

            <form
              onSubmit={applyFilters}
              role="search"
              aria-label={t('opportunities:public.filtersLabel')}
              className="mt-8 grid gap-2 rounded-xl border border-border bg-background p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,11rem)_auto]"
            >
              <SearchInput
                label={t('opportunities:public.searchLabel')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('opportunities:public.searchPlaceholder')}
                className="h-12"
                wrapperClassName="sm:col-span-2 lg:col-span-1"
              />
              <Input
                aria-label={t('opportunities:public.locationLabel')}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t('opportunities:public.locationPlaceholder')}
                className="h-12"
              />
              <Select
                aria-label={t('opportunities:public.workModeLabel')}
                value={workMode}
                onChange={(event) => setWorkMode(event.target.value as WorkMode | '')}
                className="h-12"
              >
                <option value="">{t('opportunities:public.allWorkModes')}</option>
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`opportunities:workModeValues.${mode}`)}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
                <Icon name="search" className="size-4" />
                {t('common:landing.hero2.search')}
              </Button>
            </form>
          </PublicContainer>
        </section>

        <PublicContainer as="section" aria-labelledby="results-heading" className="py-10 lg:py-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="results-heading" className="font-display text-title-section text-foreground">
              {t('opportunities:public.allInternships')}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {result.data && total > 0 && (
                <p className="text-body text-foreground-secondary" aria-live="polite">
                  {t('opportunities:public.showing', { from, to, total })}
                </p>
              )}
              {filtered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {t('opportunities:public.clearFilters')}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            {result.isLoading ? (
              <OpportunityGridSkeleton count={6} label={t('opportunities:public.loading')} />
            ) : result.isError ? (
              <ErrorState description={t('opportunities:public.error')} onRetry={() => void result.refetch()} />
            ) : result.data?.content.length === 0 ? (
              filtered ? (
                <EmptyState
                  icon="search"
                  title={t('opportunities:public.noMatchesTitle')}
                  description={t('opportunities:public.noMatchesHint')}
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      {t('opportunities:public.clearFilters')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon="briefcase"
                  title={t('opportunities:public.emptyTitle')}
                  description={t('opportunities:public.emptyHint')}
                />
              )
            ) : (
              <ul className={OPPORTUNITY_GRID}>
                {result.data?.content.map((opportunity, index) => (
                  <Reveal as="li" key={opportunity.id} index={index % 3} className="min-w-0">
                    <PublicOpportunityCard opportunity={opportunity} />
                  </Reveal>
                ))}
              </ul>
            )}
          </div>

          {result.data && result.data.totalPages > 1 && (
            <Pagination page={result.data.page} totalPages={result.data.totalPages} onPageChange={setPage} className="mt-10" />
          )}
        </PublicContainer>
      </div>
    </PublicBookmarks>
  )
}
