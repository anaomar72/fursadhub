import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import type { OrganizationType } from '../types'
import {
  Button,
  ButtonLink,
  CARD_GRID,
  EmptyState,
  EntityCard,
  ErrorState,
  Icon,
  Input,
  Pagination,
  SearchInput,
  Select,
  SkeletonCardGrid,
} from '../../../components/ui'
import { PublicContainer } from '../../../app/layouts/PublicContainer'

const TYPES: OrganizationType[] = ['COMPANY', 'NGO', 'GOVERNMENT', 'OTHER']
const PAGE_SIZE = 12

/**
 * The approved public organization directory (design-reference/presentation-refresh-2026,
 * reference 04): the navy/orange headline, a search-and-filter row, then a three-column card grid
 * with the open-opportunity count and profile link in each card's footer.
 *
 * <p>This now calls the REAL directory endpoint (`GET /api/v1/public/organizations`) rather than
 * collapsing the opportunity feed into a set of organizations, so the page shows every published
 * organization — including those not currently recruiting — and its `openOpportunityCount` is the
 * backend's own number rather than one this page counted.
 */
export function PublicOrganizationListPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState(params.get('query') ?? '')
  const [type, setType] = useState<OrganizationType | ''>((params.get('type') as OrganizationType | null) ?? '')
  const [city, setCity] = useState(params.get('city') ?? '')
  const appliedQuery = params.get('query') ?? ''
  const appliedType = (params.get('type') as OrganizationType | null) ?? ''
  const appliedCity = params.get('city') ?? ''
  const appliedSort = params.get('sort') ?? 'name'

  // Paging is scoped to the filters it was chosen under, so changing a filter starts at page 1
  // without an effect that renders once on the stale page first.
  const filterKey = [appliedQuery, appliedType, appliedCity, appliedSort].join('|')
  const [paging, setPaging] = useState({ key: filterKey, page: 0 })
  const page = paging.key === filterKey ? paging.page : 0
  const setPage = (next: number) => setPaging({ key: filterKey, page: next })

  const result = useQuery({
    queryKey: ['public-organizations', appliedQuery, appliedType, appliedCity, appliedSort, page],
    queryFn: () =>
      organizationApi.listPublicOrganizations({
        query: appliedQuery || undefined,
        type: appliedType || undefined,
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
    if (type) next.set('type', type)
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
            {t('common:publicPages.organizations.heroLead')}{' '}
            {t('common:publicPages.organizations.heroBuild')}{' '}
            <span className="text-brand-accent-ink">{t('common:publicPages.organizations.heroAccent')}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-body-lg text-foreground-secondary">
            {t('common:publicPages.organizations.heroDescription')}
          </p>

          <form
            onSubmit={applyFilters}
            role="search"
            aria-label={t('common:publicPages.organizations.searchLabel')}
            className="mt-8 grid gap-2 rounded-xl border border-border bg-background p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,12rem)_auto]"
          >
            <SearchInput
              label={t('common:publicPages.organizations.searchLabel')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('common:publicPages.organizations.search')}
              className="h-12"
              wrapperClassName="sm:col-span-2 lg:col-span-1"
            />
            <Input
              aria-label={t('common:publicPages.organizations.locationLabel')}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder={t('common:publicPages.organizations.locationPlaceholder')}
              className="h-12"
            />
            <Select
              aria-label={t('common:publicPages.organizations.typeLabel')}
              value={type}
              onChange={(event) => setType(event.target.value as OrganizationType | '')}
              className="h-12"
            >
              <option value="">{t('common:publicPages.organizations.allTypes')}</option>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`organization:typeValues.${value}`)}
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

      {/*
        A named region: the page runs h1 → this h2 → each card's h3, so a screen reader navigating by
        heading has an unbroken spine and the results list has a name.
      */}
      <PublicContainer as="section" aria-labelledby="organization-results" className="py-10 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="organization-results" className="font-display text-title-section text-foreground">
              {t('common:publicPages.organizations.resultsHeading')}
            </h2>
            {result.data && total > 0 && (
              <p className="text-body text-foreground-secondary" aria-live="polite">
                {t('common:publicPages.organizations.showing', { from, to, total })}
              </p>
            )}
          </div>
          {result.data && (
            <label className="flex items-center gap-2 text-body text-foreground-secondary">
              {t('common:publicPages.organizations.sortLabel')}
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
                <option value="name">{t('common:publicPages.organizations.sortName')}</option>
                <option value="nameDesc">{t('common:publicPages.organizations.sortNameDesc')}</option>
                <option value="recentlyVerified">{t('common:publicPages.organizations.sortRecentlyVerified')}</option>
              </Select>
            </label>
          )}
        </div>

        <div className="mt-6">
          {result.isLoading ? (
            <SkeletonCardGrid count={6} label={t('common:publicPages.organizations.loading')} />
          ) : result.isError ? (
            <ErrorState
              description={t('common:publicPages.organizations.error')}
              onRetry={() => void result.refetch()}
            />
          ) : result.data?.content.length === 0 ? (
            <EmptyState icon="building" title={t('common:publicPages.organizations.empty')} />
          ) : (
            <ul className={CARD_GRID}>
              {result.data?.content.map((organization) => (
                <li key={organization.id} className="min-w-0">
                  <EntityCard
                    className="h-full"
                    name={organization.name}
                    verified={organization.verified}
                    imageUrl={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : undefined}
                    subtitle={[t(`organization:typeValues.${organization.type}`), organization.city]
                      .filter(Boolean)
                      .join(' • ')}
                    description={organization.shortDescription ?? organization.description ?? undefined}
                    meta={
                      <span className="flex items-center gap-1.5 text-label font-normal text-foreground-secondary">
                        <Icon name="briefcase" className="size-4 shrink-0 text-muted" />
                        {t('common:publicPages.organizations.openOpportunities', {
                          count: organization.openOpportunityCount,
                        })}
                      </span>
                    }
                    actions={
                      <ButtonLink to={`/organizations/${organization.id}`} variant="outline" size="sm">
                        {t('common:publicPages.organizations.view')}
                      </ButtonLink>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {result.data && result.data.totalPages > 1 && (
          <Pagination page={result.data.page} totalPages={result.data.totalPages} onPageChange={setPage} className="mt-10" />
        )}

        <p className="mt-8 max-w-prose text-body text-foreground-secondary">{t('common:publicPages.organizations.scopeNote')}</p>
      </PublicContainer>
    </div>
  )
}
