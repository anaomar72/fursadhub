import * as publicOpportunityApi from '../../opportunities/api/publicOpportunityApi'
import * as organizationApi from '../../organization/api/organizationApi'
import { UniversityDirectoryCard } from '../components/UniversityDirectoryCard'
import { cn } from '../../../lib/utils/cn'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import {
  Button,
  Card,
  EmptyState,
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
 * The top counters use public directory totals; student reach and university-specific opportunity
 * totals are not invented. The longer partnership explanation is available in a disclosure.
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

  const network = useQuery({
    queryKey: ['public-network-counts'],
    queryFn: async () => {
      const [universities, organizations, opportunities] = await Promise.all([
        universityApi.listPublicUniversities({ size: 1 }), organizationApi.listPublicOrganizations({ size: 1 }), publicOpportunityApi.listPublicOpportunities({ size: 1 }),
      ])
      return [{ key: 'universities', value: universities.totalElements, icon: 'bank' as const }, { key: 'organizations', value: organizations.totalElements, icon: 'building' as const }, { key: 'internships', value: opportunities.totalElements, icon: 'briefcase' as const }]
    }, retry: false,
  })
  const total = result.data?.totalElements ?? 0
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(total, (page + 1) * PAGE_SIZE)

  return (
    <div className="overflow-x-clip">
      <section className="mx-auto w-full max-w-[1448px] px-4 py-8 sm:px-6 lg:px-[60px]">
        <div className="grid items-start gap-8 lg:grid-cols-2"><header>
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
        </header>{network.data && <dl className="grid grid-cols-3 rounded-xl border border-border bg-surface px-3 py-6 shadow-xs">{network.data.map(item => <div key={item.key} className="flex flex-col gap-2 border-border px-3 [&+div]:border-l"><Icon name={item.icon} className="size-6 text-brand-blue" /><dt className="text-xs text-foreground-secondary">{t(`common:landing.stats.${item.key}`)}</dt><dd className="font-display text-xl font-extrabold text-brand-navy dark:text-foreground">{item.value.toLocaleString()}</dd></div>)}</dl>}</div>

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

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="sr-only">
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
            /*
              Four columns at the widest, not six, and a short row is centred and capped rather than
              left-packed. At six columns each institution card was 195px wide — too narrow for a
              crest, a name, a verified badge, a city and a line of description — and the pilot's two
              partner universities sat as two small cards against two thirds of empty row, which
              reads as a directory that failed to load rather than as a directory with two entries.
              Same rule the testimonial wall already uses: adapt to how many there actually are.
            */
            <ul
              className={cn(
                'grid gap-5',
                (result.data?.content.length ?? 0) === 1 && 'mx-auto max-w-sm',
                (result.data?.content.length ?? 0) === 2 && 'mx-auto max-w-3xl sm:grid-cols-2',
                (result.data?.content.length ?? 0) >= 3 && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              )}
            >
              {result.data?.content.map((university) => (
                <li key={university.id}>
                  <UniversityDirectoryCard id={university.id} name={university.name} verified={university.verified} imageUrl={university.hasLogo ? universityApi.universityLogoUrl(university.id) : undefined} city={university.city} description={university.description} />
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
        <details className="mx-auto max-w-[1448px] px-4 py-5 sm:px-6 lg:px-[60px]"><summary className="cursor-pointer rounded text-sm font-bold text-brand-navy focus-visible:ring-2">{t('common:publicPages.universities.benefits')}</summary>
          <h2 className="sr-only text-center font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
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
          <Link to="/register?role=university" className="mx-auto mt-4 flex min-h-10 w-fit items-center rounded-lg bg-action-primary px-5 text-sm font-bold text-on-action focus-visible:ring-2">{t('common:publicPages.universities.getStarted')}</Link>
        </details>
      </section>
    </div>
  )
}
