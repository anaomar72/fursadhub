import { UniversityDirectoryCard } from '../components/UniversityDirectoryCard'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import {
  Button,
  ButtonLink,
  CARD_GRID,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  Pagination,
  Reveal,
  SearchInput,
  Select,
  SkeletonCardGrid,
  type IconName,
} from '../../../components/ui'
import { PublicContainer } from '../../../app/layouts/PublicContainer'

const BENEFITS: { key: string; icon: IconName }[] = [
  { key: 'students', icon: 'idCard' },
  { key: 'nominations', icon: 'users' },
  { key: 'placements', icon: 'briefcase' },
  { key: 'supervision', icon: 'clipboard' },
  { key: 'policies', icon: 'document' },
  { key: 'verification', icon: 'shield' },
]
const PAGE_SIZE = 12

/**
 * The public universities page: the partner-university directory, then what a university gets from
 * joining.
 *
 * <p>The directory (`GET /api/v1/public/universities`) is the page's purpose, so it comes first, in
 * the same header-band-and-toolbar composition as the internships and organizations directories.
 *
 * <p>Two things were removed. The headline counters ("2 universities, 3 organizations, 5
 * internships") presented the pilot's size as proof; the directory itself shows who is here. And the
 * benefits for universities — working, translated content — were folded into a closed disclosure
 * nobody opened; they are now a visible section with one clear call to action.
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
    <div className="bg-background">
      <section className="border-b border-border bg-surface">
        <PublicContainer className="py-10 lg:py-14">
          <h1 className="max-w-3xl font-display text-display-lg text-foreground">
            {t('common:publicPages.universities.heroLead')}{' '}
            {t('common:publicPages.universities.heroBuild')}{' '}
            <span className="text-brand-accent-ink">{t('common:publicPages.universities.heroAccent')}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-body-lg text-foreground-secondary">
            {t('common:publicPages.universities.heroDescription')}
          </p>

          <form
            onSubmit={applyFilters}
            role="search"
            aria-label={t('common:publicPages.universities.searchLabel')}
            className="mt-8 grid gap-2 rounded-xl border border-border bg-background p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto]"
          >
            <SearchInput
              label={t('common:publicPages.universities.searchLabel')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('common:publicPages.universities.search')}
              className="h-12"
              wrapperClassName="sm:col-span-2 lg:col-span-1"
            />
            <Input
              aria-label={t('common:publicPages.universities.locationLabel')}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder={t('common:publicPages.universities.locationPlaceholder')}
              className="h-12"
            />
            <Button type="submit" size="lg">
              <Icon name="search" className="size-4" />
              {t('common:landing.hero2.search')}
            </Button>
          </form>
        </PublicContainer>
      </section>

      <PublicContainer as="section" aria-labelledby="university-results" className="py-10 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="university-results" className="font-display text-title-section text-foreground">
              {t('common:publicPages.universities.directoryTitle')}
            </h2>
            {result.data && total > 0 && (
              <p className="text-body text-foreground-secondary" aria-live="polite">
                {t('common:publicPages.universities.showing', { from, to, total })}
              </p>
            )}
          </div>
          {result.data && (
            <label className="flex items-center gap-2 text-body text-foreground-secondary">
              {t('common:publicPages.universities.sortLabel')}
              <Select
                value={appliedSort}
                onChange={(event) => {
                  const next = new URLSearchParams(params)
                  if (event.target.value === 'name') next.delete('sort')
                  else next.set('sort', event.target.value)
                  setParams(next)
                }}
                className="w-48"
              >
                <option value="name">{t('common:publicPages.universities.sortName')}</option>
                <option value="nameDesc">{t('common:publicPages.universities.sortNameDesc')}</option>
                <option value="recentlyVerified">{t('common:publicPages.universities.sortRecentlyVerified')}</option>
              </Select>
            </label>
          )}
        </div>

        <div className="mt-6">
          {result.isLoading ? (
            <SkeletonCardGrid count={4} label={t('common:publicPages.universities.loading')} />
          ) : result.isError ? (
            <ErrorState description={t('common:publicPages.universities.error')} onRetry={() => void result.refetch()} />
          ) : result.data?.content.length === 0 ? (
            <EmptyState icon="bank" title={t('common:publicPages.universities.empty')} />
          ) : (
            <ul className={CARD_GRID}>
              {result.data?.content.map((university) => (
                <li key={university.id} className="min-w-0">
                  <UniversityDirectoryCard
                    id={university.id}
                    name={university.name}
                    verified={university.verified}
                    imageUrl={university.hasLogo ? universityApi.universityLogoUrl(university.id) : undefined}
                    city={university.city}
                    description={university.description}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {result.data && result.data.totalPages > 1 && (
          <Pagination page={result.data.page} totalPages={result.data.totalPages} onPageChange={setPage} className="mt-10" />
        )}
      </PublicContainer>

      <section id="benefits" aria-labelledby="benefits-heading" className="scroll-mt-20 border-t border-border bg-surface">
        <PublicContainer className="py-14 lg:py-20">
          <Reveal>
            <h2 id="benefits-heading" className="font-display text-display-lg text-foreground">
              {t('common:publicPages.universities.benefits')}
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((item, index) => (
              <Reveal as="li" key={item.key} index={index % 3} className="min-w-0">
                <span className="flex size-11 items-center justify-center rounded-lg bg-brand-navy-soft text-brand-navy dark:text-foreground">
                  <Icon name={item.icon} className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-title-panel text-foreground">
                  {t(`common:publicPages.universities.items.${item.key}.title`)}
                </h3>
                <p className="mt-1.5 text-body text-foreground-secondary">
                  {t(`common:publicPages.universities.items.${item.key}.body`)}
                </p>
              </Reveal>
            ))}
          </ul>
          <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-prose text-body text-foreground-secondary">{t('common:publicPages.universities.directoryNote')}</p>
            <ButtonLink to="/register?role=university" size="lg" className="shrink-0">
              {t('common:publicPages.universities.getStarted')}
            </ButtonLink>
          </div>
        </PublicContainer>
      </section>
    </div>
  )
}
