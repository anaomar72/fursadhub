import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import {
  Button,
  Card,
  EmptyState,
  EntityCard,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  Select,
} from '../../../components/ui'

const BENEFITS = ['students', 'nominations', 'placements', 'supervision', 'policies', 'verification'] as const
const PAGE_SIZE = 12

/**
 * The approved public universities page (design-reference/presentation-refresh-2026, reference 06).
 *
 * <p>The reference turns this page from a marketing pitch into a real DIRECTORY: headline, search,
 * then a grid of partner-university cards. That directory endpoint already existed
 * (`GET /api/v1/public/universities`) and was simply never called from the frontend; this page now
 * calls it. The existing "Benefits for universities" section is preserved beneath the directory,
 * since it is working content the reference does not replace.
 *
 * <p>The reference's headline counter strip ("120+ partner universities / 50K+ students reached /
 * 2,450+ opportunities shared") is not built: only the university count has an endpoint behind it,
 * and students-reached and opportunities-shared do not exist as platform metrics.
 */
export function PublicUniversitiesPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState(params.get('query') ?? '')
  const [city, setCity] = useState(params.get('city') ?? '')
  const appliedQuery = params.get('query') ?? ''
  const appliedCity = params.get('city') ?? ''
  const appliedSort = params.get('sort') ?? 'name'

  // Paging is scoped to the query it was chosen under, so a new search starts at page 1 without
  // an effect that renders once on the stale page first.
  const filterKey = [appliedQuery, appliedCity, appliedSort].join('|')
  const [paging, setPaging] = useState({ key: filterKey, page: 0 })
  const page = paging.key === filterKey ? paging.page : 0
  const setPage = (next: number) => setPaging({ key: filterKey, page: next })

  const result = useQuery({
    queryKey: ['public-universities', appliedQuery, appliedCity, appliedSort, page],
    queryFn: () =>
      universityApi.listPublicUniversities({
        query: appliedQuery || undefined,
        city: appliedCity || undefined,
        sort: appliedSort,
        page,
        size: PAGE_SIZE,
      }),
  })

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (query.trim()) next.set('query', query.trim())
    if (city.trim()) next.set('city', city.trim())
    if (appliedSort !== 'name') next.set('sort', appliedSort)
    setParams(next)
  }

  const total = result.data?.totalElements ?? 0
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(total, (page + 1) * PAGE_SIZE)

  return (
    <div className="overflow-x-clip">
      <section className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-14">
        <header className="max-w-3xl">
          <h1 className="font-display text-[30px] font-extrabold leading-[1.06] tracking-[-0.035em] text-brand-navy dark:text-foreground sm:text-[36px] lg:text-[40px]">
            <span className="block">{t('common:publicPages.universities.heroLead')}</span>
            <span className="mt-1.5 block">
              {t('common:publicPages.universities.heroBuild')}{' '}
              <span className="text-brand-accent">{t('common:publicPages.universities.heroAccent')}</span>
            </span>
          </h1>
          <p className="mt-3.5 text-sm leading-6 text-foreground-secondary">
            {t('common:publicPages.universities.heroDescription')}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              to="/register?role=university"
              className="inline-flex h-10 items-center rounded-lg bg-brand-accent px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:publicPages.universities.getStarted')}
            </Link>
            <a
              href="#benefits"
              className="inline-flex h-10 items-center rounded-lg border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:publicPages.universities.learn')}
            </a>
          </div>
        </header>

        <form onSubmit={applyFilters} className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1 sm:max-w-lg">
            <span className="sr-only">{t('common:publicPages.universities.searchLabel')}</span>
            <Icon
              name="search"
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-secondary"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('common:publicPages.universities.search')}
              className="h-10 w-full rounded-lg border border-border bg-surface ps-9 pe-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </label>
          <label className="min-w-0 sm:w-40">
            <span className="sr-only">{t('common:publicPages.universities.locationLabel')}</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder={t('common:publicPages.universities.locationPlaceholder')}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </label>
          <Button type="submit">
            {t('common:landing.hero2.search')}
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
            {t('common:publicPages.universities.directoryTitle')}
          </h2>
          {result.data && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-foreground-secondary">
                {t('common:publicPages.universities.showing', { from, to, total })}
              </p>
              <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                {t('common:publicPages.universities.sortLabel')}
                <Select
                  value={appliedSort}
                  onChange={(event) => {
                    const next = new URLSearchParams(params)
                    if (event.target.value === 'name') next.delete('sort')
                    else next.set('sort', event.target.value)
                    setParams(next)
                  }}
                  className="h-9 w-48"
                >
                  <option value="name">{t('common:publicPages.universities.sortName')}</option>
                  <option value="nameDesc">{t('common:publicPages.universities.sortNameDesc')}</option>
                  <option value="recentlyVerified">
                    {t('common:publicPages.universities.sortRecentlyVerified')}
                  </option>
                </Select>
              </label>
            </div>
          )}
        </div>

        <div className="mt-4">
          {result.isLoading ? (
            <LoadingState label={t('common:publicPages.universities.loading')} />
          ) : result.isError ? (
            <ErrorState
              description={t('common:publicPages.universities.error')}
              onRetry={() => void result.refetch()}
            />
          ) : result.data?.content.length === 0 ? (
            <EmptyState title={t('common:publicPages.universities.empty')} />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.data?.content.map((university) => (
                <li key={university.id}>
                  <EntityCard
                    name={university.name}
                    verified={university.verified}
                    imageUrl={university.hasLogo ? universityApi.universityLogoUrl(university.id) : undefined}
                    subtitle={university.city ?? undefined}
                    description={university.description ?? undefined}
                    actions={
                      <Link
                        to={`/universities/${university.id}`}
                        className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border-strong px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                      >
                        {t('common:publicPages.universities.view')}
                      </Link>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {result.data && result.data.totalPages > 1 && (
          <Pagination
            page={result.data.page}
            totalPages={result.data.totalPages}
            onPageChange={setPage}
            className="mt-10"
          />
        )}
      </section>

      <section id="benefits" className="scroll-mt-24 border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-14">
          <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
            {t('common:publicPages.universities.benefits')}
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((item, index) => (
              <Card key={item} padding="md" className="h-full">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
                  <Icon name={index % 3 === 0 ? 'globe' : index % 3 === 1 ? 'check' : 'document'} className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-extrabold tracking-tight text-brand-navy dark:text-foreground">
                  {t(`common:publicPages.universities.items.${item}.title`)}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-foreground-secondary">
                  {t(`common:publicPages.universities.items.${item}.body`)}
                </p>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted">
            {t('common:publicPages.universities.directoryNote')}
          </p>
        </div>
      </section>
    </div>
  )
}
