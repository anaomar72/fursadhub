import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import type { OrganizationType } from '../types'
import {
  Button,
  EmptyState,
  EntityCard,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  Select,
} from '../../../components/ui'

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
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-14">
      <header className="max-w-3xl">
        <h1 className="font-display text-[30px] font-extrabold leading-[1.06] tracking-[-0.035em] text-brand-navy dark:text-foreground sm:text-[36px] lg:text-[40px]">
          <span className="block">{t('common:publicPages.organizations.heroLead')}</span>
          <span className="mt-1.5 block">
            {t('common:publicPages.organizations.heroBuild')}{' '}
            <span className="text-brand-accent">{t('common:publicPages.organizations.heroAccent')}</span>
          </span>
        </h1>
        <p className="mt-3.5 text-sm leading-6 text-foreground-secondary">
          {t('common:publicPages.organizations.heroDescription')}
        </p>
      </header>

      <form onSubmit={applyFilters} className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-0 flex-1 sm:min-w-[15rem]">
          <span className="sr-only">{t('common:publicPages.organizations.searchLabel')}</span>
          <Icon
            name="search"
            className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-secondary"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('common:publicPages.organizations.search')}
            className="h-10 w-full rounded-lg border border-border bg-surface ps-9 pe-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          />
        </label>
        <label className="min-w-0 sm:w-40">
          <span className="sr-only">{t('common:publicPages.organizations.locationLabel')}</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder={t('common:publicPages.organizations.locationPlaceholder')}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          />
        </label>
        <Select
          aria-label={t('common:publicPages.organizations.typeLabel')}
          value={type}
          onChange={(event) => setType(event.target.value as OrganizationType | '')}
          className="h-10 sm:w-48"
        >
          <option value="">{t('common:publicPages.organizations.allTypes')}</option>
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`organization:typeValues.${value}`)}
            </option>
          ))}
        </Select>
        <Button type="submit">
          {t('common:landing.hero2.search')}
        </Button>
      </form>

      {result.data && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground-secondary">
            {t('common:publicPages.organizations.showing', { from, to, total })}
          </p>
          <label className="flex items-center gap-2 text-sm text-foreground-secondary">
            {t('common:publicPages.organizations.sortLabel')}
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
              <option value="name">{t('common:publicPages.organizations.sortName')}</option>
              <option value="nameDesc">{t('common:publicPages.organizations.sortNameDesc')}</option>
              <option value="recentlyVerified">{t('common:publicPages.organizations.sortRecentlyVerified')}</option>
            </Select>
          </label>
        </div>
      )}

      <div className="mt-4">
        {result.isLoading ? (
          <LoadingState label={t('common:publicPages.organizations.loading')} />
        ) : result.isError ? (
          <ErrorState
            description={t('common:publicPages.organizations.error')}
            onRetry={() => void result.refetch()}
          />
        ) : result.data?.content.length === 0 ? (
          <EmptyState title={t('common:publicPages.organizations.empty')} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data?.content.map((organization) => (
              <li key={organization.id}>
                <EntityCard
                  name={organization.name}
                  verified={organization.verified}
                  imageUrl={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : undefined}
                  subtitle={[t(`organization:typeValues.${organization.type}`), organization.city]
                    .filter(Boolean)
                    .join(' • ')}
                  description={organization.shortDescription ?? organization.description ?? undefined}
                  meta={
                    <span className="flex items-center gap-2 text-xs text-foreground-secondary">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
                        <Icon name="briefcase" className="size-3.5" />
                      </span>
                      {t('common:publicPages.organizations.openOpportunities', {
                        count: organization.openOpportunityCount,
                      })}
                    </span>
                  }
                  actions={
                    <Link
                      to={`/organizations/${organization.id}`}
                      className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border-strong px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                    >
                      {t('common:publicPages.organizations.view')}
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

      <p className="mt-6 text-sm text-muted">{t('common:publicPages.organizations.scopeNote')}</p>
    </div>
  )
}
