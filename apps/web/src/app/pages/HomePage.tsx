import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Avatar, Button, Icon, InternshipCard, Select, VerifiedBadge } from '../../components/ui'
import * as publicOpportunityApi from '../../features/opportunities/api/publicOpportunityApi'
import * as organizationApi from '../../features/organization/api/organizationApi'
import * as universityApi from '../../features/university/api/universityApi'
import type { WorkMode } from '../../features/opportunities/types'
import { HomeHeroIllustration } from './HomeHeroIllustration'

const WORK_MODES: WorkMode[] = ['ONSITE', 'HYBRID', 'REMOTE']
const AUDIENCES = ['student', 'organization', 'university'] as const
const POPULAR_SEARCHES = ['Software Engineering', 'Data Science', 'Marketing', 'Design', 'Business'] as const

/**
 * The approved FursadHub landing page (design-reference/presentation-refresh-2026, reference 01):
 * search-led hero with live platform counts, featured internships, the verified organization
 * strip, the three-audience "How FursadHub Works" band, and the navy call to action.
 *
 * <p>Everything with a number or a name behind it is REAL: the counts are the `totalElements` of
 * the three public directories, the featured internships are the published opportunity feed, and
 * the organization strip is the public organization directory. The reference's illustrative
 * examples (Google, UNICEF, "2,450+") are never hard-coded, and its testimonial row is omitted
 * entirely because no endpoint supplies testimonials.
 */
export function HomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'so' ? 'so-SO' : 'en'

  const featured = useQuery({
    queryKey: ['public-opportunities', 'featured'],
    queryFn: () => publicOpportunityApi.listPublicOpportunities({ page: 0, size: 6 }),
  })
  const organizations = useQuery({
    queryKey: ['public-organizations', 'home'],
    queryFn: () => organizationApi.listPublicOrganizations({ page: 0, size: 10, sort: 'recentlyVerified' }),
  })
  const universities = useQuery({
    queryKey: ['public-universities', 'home'],
    queryFn: () => universityApi.listPublicUniversities({ page: 0, size: 1 }),
  })

  return (
    <div className="overflow-x-clip bg-background">
      <Hero
        t={t}
        stats={{
          internships: featured.data?.totalElements,
          organizations: organizations.data?.totalElements,
          universities: universities.data?.totalElements,
        }}
      />

      {/* ------------------------------------------------------------ featured internships */}
      <section aria-labelledby="featured-heading" className="mx-auto max-w-[1400px] px-4 pb-2 sm:px-6 lg:px-14">
        <SectionHeading
          id="featured-heading"
          title={t('common:landing.featured.title')}
          action={{ to: '/opportunities', label: t('common:landing.featured.viewAll') }}
        />
        {featured.data && featured.data.content.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {featured.data.content.map((opportunity) => (
              <li key={opportunity.id} className="relative">
                <InternshipCard
                  density="compact"
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
                  workMode={t(`opportunities:workModeValues.${opportunity.workMode}`)}
                  deadline={
                    opportunity.applicationDeadline
                      ? t('opportunities:public.applyBy', {
                          date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                            new Date(opportunity.applicationDeadline),
                          ),
                        })
                      : undefined
                  }
                />
                {/* The approved featured card is itself the link — one stretched anchor keeps a
                    single tab stop and one accessible name per card. */}
                <Link
                  to={`/opportunities/${opportunity.id}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span className="sr-only">{opportunity.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !featured.isLoading && (
            <p className="mt-5 text-sm text-foreground-secondary">{t('common:landing.featured.empty')}</p>
          )
        )}
      </section>

      {/* ------------------------------------------------------------ verified organizations */}
      {organizations.data && organizations.data.content.length > 0 && (
        <section aria-labelledby="organizations-heading" className="mx-auto max-w-[1400px] px-4 pt-9 sm:px-6 lg:px-14">
          <SectionHeading
            id="organizations-heading"
            title={t('common:landing.verifiedOrganizations.title')}
            action={{ to: '/organizations', label: t('common:landing.verifiedOrganizations.viewAll') }}
          />
          <ul className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-surface px-5 py-3 shadow-xs">
            {organizations.data.content.map((organization) => (
              <li key={organization.id}>
                <Link
                  to={`/organizations/${organization.id}`}
                  className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <Avatar
                    name={organization.name}
                    src={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : undefined}
                    size="sm"
                    shape="square"
                  />
                  <span className="text-xs font-semibold text-brand-navy dark:text-foreground">{organization.name}</span>
                  {organization.verified && <VerifiedBadge size="sm" />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------ how it works */}
      <section id="how-it-works" className="scroll-mt-24 px-4 py-8 sm:px-6 lg:px-14">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
            {t('common:landing.ecosystem.title')}
          </h2>
          <div className="mt-5 grid overflow-hidden rounded-xl border border-border bg-surface shadow-xs lg:grid-cols-3">
            {AUDIENCES.map((audience, index) => (
              <div
                key={audience}
                className="flex h-full flex-col border-b border-border p-5 last:border-b-0 lg:border-b-0 lg:border-e lg:last:border-e-0"
              >
                <div className="flex items-start gap-3">
                  <AudienceIcon index={index} />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-extrabold tracking-tight text-brand-navy dark:text-foreground">
                      {t(`common:landing.ecosystem.${audience}.title`)}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-foreground-secondary">
                      {t(`common:landing.ecosystem.${audience}.body`)}
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {(t(`common:landing.works.${audience}.points`, { returnObjects: true }) as string[]).map((point) => (
                    <li key={point} className="flex items-start gap-2 text-xs leading-5 text-foreground-secondary">
                      <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-success" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={AUDIENCE_CTA[audience]}
                  className="mt-4 inline-flex items-center gap-1.5 self-start rounded text-xs font-bold text-brand-accent-ink transition-colors hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                >
                  {t(`common:landing.works.${audience}.cta`)}
                  <Icon name="chevronRight" className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ navy call to action */}
      <section className="px-4 pb-10 sm:px-6 lg:px-14">
        <div className="surface-dark relative mx-auto flex max-w-[1400px] flex-col items-start gap-4 overflow-hidden rounded-xl bg-surface px-5 py-4 text-foreground sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative">
            <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
              {t('common:landing.band.title')}
            </h2>
            <p className="mt-1 text-xs text-foreground-secondary">{t('common:landing.band.body')}</p>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Link
              to="/register?role=organization"
              className="inline-flex h-9 items-center rounded-lg bg-brand-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:landing.band.primary')}
            </Link>
            <Link
              to="/register"
              className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-xs font-semibold text-brand-navy transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:landing.band.secondary')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

const AUDIENCE_CTA = {
  student: '/register?role=student',
  organization: '/register?role=organization',
  university: '/register?role=university',
} as const

/**
 * The approved hero: headline, the search form that actually drives the internships page, the
 * popular-search chips, the live platform counts, and the illustration.
 */
function Hero({
  t,
  stats,
}: {
  t: TFunction
  stats: { internships?: number; organizations?: number; universities?: number }
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode | ''>('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('query', query.trim())
    if (location.trim()) params.set('location', location.trim())
    if (workMode) params.set('workMode', workMode)
    const search = params.toString()
    navigate(search ? `/opportunities?${search}` : '/opportunities')
  }

  // Only counts the backend actually returned. A directory that has not loaded, or errored, is
  // simply absent rather than shown as a zero the platform never claimed.
  const statEntries = [
    { key: 'internships', icon: 'briefcase' as const, value: stats.internships },
    { key: 'organizations', icon: 'building' as const, value: stats.organizations },
    { key: 'universities', icon: 'graduationCap' as const, value: stats.universities },
  ].filter((entry) => typeof entry.value === 'number')

  return (
    <section className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 pb-6 pt-7 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:px-14">
      <div className="animate-hero-fade motion-reduce:animate-none">
        <h1 className="font-display text-[34px] font-extrabold leading-[1.06] tracking-[-0.035em] text-brand-navy dark:text-foreground sm:text-[40px] lg:text-[44px]">
          <span className="block">{t('common:landing.hero2.titleLead')}</span>
          <span className="mt-1.5 block">
            {t('common:landing.hero2.titleBuild')} <span className="text-brand-accent">{t('common:landing.hero2.titleAccent')}</span>
          </span>
        </h1>
        <p className="mt-3.5 max-w-xl text-sm leading-6 text-foreground-secondary">
          {t('common:landing.hero2.description')}
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative min-w-0 flex-1 sm:min-w-[11rem]">
            <span className="sr-only">{t('common:landing.hero2.searchLabel')}</span>
            <Icon
              name="search"
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-secondary"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('common:landing.hero2.searchPlaceholder')}
              className="h-10 w-full rounded-lg border border-border bg-surface ps-9 pe-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </label>
          <label className="min-w-0 sm:w-36">
            <span className="sr-only">{t('common:landing.hero2.locationLabel')}</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('common:landing.hero2.locationPlaceholder')}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </label>
          <Select
            aria-label={t('common:landing.hero2.workModeLabel')}
            value={workMode}
            onChange={(event) => setWorkMode(event.target.value as WorkMode | '')}
            className="h-10 sm:w-40"
          >
            <option value="">{t('common:landing.hero2.allWorkModes')}</option>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`opportunities:workModeValues.${mode}`)}
              </option>
            ))}
          </Select>
          <Button type="submit" className="sm:w-auto">
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
          <Link
            to="/opportunities"
            className="rounded font-bold text-brand-accent-ink transition-colors hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {t('common:landing.hero2.viewAll')}
          </Link>
        </div>

        {statEntries.length > 0 && (
          <ul
            aria-label={t('common:landing.stats.label')}
            className="mt-5 grid gap-3 sm:grid-cols-3"
          >
            {statEntries.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-xs"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent-soft text-brand-accent-ink">
                  <Icon name={entry.icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-extrabold leading-none text-brand-navy dark:text-foreground">
                    {entry.value?.toLocaleString()}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-foreground-secondary">
                    {t(`common:landing.stats.${entry.key}`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="animate-hero-fade motion-reduce:animate-none">
        <HomeHeroIllustration />
      </div>
    </section>
  )
}

function SectionHeading({
  id,
  title,
  action,
}: {
  id: string
  title: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
        {title}
      </h2>
      {action && (
        <Link
          to={action.to}
          className="inline-flex items-center gap-1.5 rounded text-sm font-bold text-brand-accent-ink transition-colors hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
        >
          {action.label}
          <Icon name="chevronRight" className="size-4" />
        </Link>
      )}
    </div>
  )
}

function AudienceIcon({ index }: { index: number }) {
  const names = ['graduationCap', 'building', 'bank'] as const
  const tones = [
    'bg-brand-blue-soft text-brand-blue',
    'bg-brand-accent-soft text-brand-accent-ink',
    'bg-brand-navy-soft text-brand-navy dark:text-foreground',
  ] as const
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tones[index]}`}>
      <Icon name={names[index]} className="size-[18px]" />
    </span>
  )
}
