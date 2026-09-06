import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import * as organizationApi from '../../organization/api/organizationApi'
import type { PublicOpportunityResponse, WorkMode } from '../types'
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  InternshipCard,
  LoadingState,
  Pagination,
  Select,
} from '../../../components/ui'
import { HomeHeroIllustration } from '../../../app/pages/HomeHeroIllustration'

const WORK_MODES: WorkMode[] = ['ONSITE', 'HYBRID', 'REMOTE']
const POPULAR_SEARCHES = ['Software Engineering', 'Data Science', 'Marketing', 'Design', 'Business'] as const
const PAGE_SIZE = 12

/**
 * The approved public internships directory (design-reference/presentation-refresh-2026,
 * reference 02): a search-led hero beside the brand panel, then the paged card grid with a result
 * count and the sort control.
 *
 * <p>The filters are seeded from the URL, so the landing page's hero search and the "popular"
 * chips both land here with their query already applied and shareable.
 *
 * <p>The reference's right-hand promotional rail ("Advance your career", "Are you an
 * organization?") is not built: it advertises personalised recommendations and email alerts that
 * this API does not provide, and the reference README forbids fabricating them.
 */
export function PublicOpportunityListPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()

  const organization = params.get('organization') ?? undefined
  const [query, setQuery] = useState(params.get('query') ?? '')
  const [location, setLocation] = useState(params.get('location') ?? '')
  const [workMode, setWorkMode] = useState<WorkMode | ''>((params.get('workMode') as WorkMode | null) ?? '')
  // The URL is the source of truth for the applied filters, so arriving from the landing page's
  // hero search (or sharing a filtered link) shows the same results the sender saw.
  const appliedQuery = params.get('query') ?? ''
  const appliedLocation = params.get('location') ?? ''
  const appliedWorkMode = (params.get('workMode') as WorkMode | null) ?? ''

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

  const total = result.data?.totalElements ?? 0
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(total, (page + 1) * PAGE_SIZE)

  return (
    <div className="bg-background">
      <section className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 pb-7 pt-7 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:px-14">
        <div>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.06] tracking-[-0.035em] text-brand-navy dark:text-foreground sm:text-[36px] lg:text-[40px]">
            <span className="block">{t('opportunities:public.heroLead')}</span>
            <span className="mt-1.5 block">
              {t('opportunities:public.heroBuild')}{' '}
              <span className="text-brand-accent">{t('opportunities:public.heroAccent')}</span>
            </span>
          </h1>
          <p className="mt-3.5 max-w-xl text-sm leading-6 text-foreground-secondary">
            {t('opportunities:public.heroDescription')}
          </p>

          <form onSubmit={applyFilters} className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="relative min-w-0 flex-1 sm:min-w-[11rem]">
              <span className="sr-only">{t('opportunities:public.searchLabel')}</span>
              <Icon
                name="search"
                className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-secondary"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('opportunities:public.searchPlaceholder')}
                className="h-10 w-full rounded-lg border border-border bg-surface ps-9 pe-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
            </label>
            <label className="min-w-0 sm:w-36">
              <span className="sr-only">{t('opportunities:public.locationLabel')}</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t('opportunities:public.locationPlaceholder')}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
            </label>
            <Select
              aria-label={t('opportunities:public.workModeLabel')}
              value={workMode}
              onChange={(event) => setWorkMode(event.target.value as WorkMode | '')}
              className="h-10 sm:w-40"
            >
              <option value="">{t('opportunities:public.allWorkModes')}</option>
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`opportunities:workModeValues.${mode}`)}
                </option>
              ))}
            </Select>
            <Button type="submit">
              {t('common:landing.hero2.search')}
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-foreground-secondary">{t('common:landing.hero2.popular')}</span>
            {POPULAR_SEARCHES.map((term) => (
              <Link
                key={term}
                to={`/opportunities?query=${encodeURIComponent(term)}`}
                className="rounded-full border border-border bg-surface px-3 py-1 font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden lg:block">
          <HomeHeroIllustration />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 pb-10 sm:px-6 lg:px-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
              {t('opportunities:public.allInternships')}
            </h2>
            {result.data && (
              <p className="text-sm text-foreground-secondary">
                {t('opportunities:public.showing', { from, to, total })}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          {result.isLoading ? (
            <LoadingState label={t('opportunities:public.loading')} />
          ) : result.isError ? (
            <ErrorState description={t('opportunities:public.error')} onRetry={() => void result.refetch()} />
          ) : result.data?.content.length === 0 ? (
            <EmptyState title={t('opportunities:public.empty')} />
          ) : (
            <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {result.data?.content.map((opportunity) => (
                <li key={opportunity.id}>
                  <OpportunityCard opportunity={opportunity} locale={i18n.resolvedLanguage ?? 'en'} t={t} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {result.data && result.data.totalPages > 1 && (
          <Pagination page={result.data.page} totalPages={result.data.totalPages} onPageChange={setPage} className="mt-10" />
        )}
      </section>
    </div>
  )
}

function OpportunityCard({
  opportunity,
  locale,
  t,
}: {
  opportunity: PublicOpportunityResponse
  locale: string
  t: TFunction
}) {
  const durationMonths = Math.max(
    1,
    Math.round(
      (new Date(opportunity.endDate).getTime() - new Date(opportunity.startDate).getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    ),
  )

  return (
    <InternshipCard
      title={opportunity.title}
      organization={opportunity.organization.name}
      organizationVerified={opportunity.organization.verified}
      logo={
        opportunity.organization.hasLogo ? (
          <img
            src={organizationApi.organizationLogoUrl(opportunity.organization.id)}
            alt=""
            className="size-full rounded object-contain"
          />
        ) : undefined
      }
      location={opportunity.location ?? undefined}
      duration={t('opportunities:public.durationMonths', { count: durationMonths })}
      workMode={t(`opportunities:workModeValues.${opportunity.workMode}`)}
      deadline={
        opportunity.applicationDeadline
          ? t('opportunities:public.applyBy', {
              date: new Intl.DateTimeFormat(locale === 'so' ? 'so-SO' : 'en', { dateStyle: 'medium' }).format(
                new Date(opportunity.applicationDeadline),
              ),
            })
          : undefined
      }
      actions={
        <Link
          to={`/opportunities/${opportunity.id}`}
          className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
        >
          {t('opportunities:public.viewDetails')}
        </Link>
      }
    >
      <p className="line-clamp-2">{opportunity.description}</p>
    </InternshipCard>
  )
}
