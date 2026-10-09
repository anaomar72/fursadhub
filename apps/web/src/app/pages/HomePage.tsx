import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, ButtonLink, EmptyState, ErrorState, Icon, Input, Reveal, SearchInput, Select, VerifiedBadge, type IconName } from '../../components/ui'
import * as publicOpportunityApi from '../../features/opportunities/api/publicOpportunityApi'
import * as organizationApi from '../../features/organization/api/organizationApi'
import type { PageResponse, PublicOpportunityResponse, WorkMode } from '../../features/opportunities/types'
import type { PublicOrganizationSummaryResponse } from '../../features/organization/types'
import { OPPORTUNITY_GRID, OpportunityGridSkeleton, PublicOpportunityCard } from '../../features/opportunities/components/PublicOpportunityCard'
import { PublicBookmarks } from '../../features/student/components/PublicBookmarks'
import { TestimonialWall } from '../../features/testimonials/components/TestimonialWall'
import { useAuth } from '../../lib/auth/AuthContext'
import { PublicContainer } from '../layouts/PublicContainer'
import { HomeHeroIllustration } from './HomeHeroIllustration'

const WORK_MODES: WorkMode[] = ['ONSITE', 'HYBRID', 'REMOTE']

/** The section title role on the public site — one size for every h2, so the page has one rhythm. */
const SECTION_TITLE = 'font-display text-display-lg text-foreground'

/**
 * The public home page.
 *
 * <p>It has to answer five questions in order, and each section answers one:
 * <ol>
 *   <li><strong>What is this?</strong> — the hero: one internship pipeline for Somalia's students,
 *       universities and organizations, with the marketplace search as the primary action.</li>
 *   <li><strong>Why trust it?</strong> — the verification facts the product actually enforces, and
 *       the verified organizations that are really on the platform.</li>
 *   <li><strong>What can I do here now?</strong> — the latest published internships.</li>
 *   <li><strong>How does it work, and who is it for?</strong> — the journey, then the three roles.</li>
 *   <li><strong>What happens after the offer?</strong> — the placement lifecycle, which is what makes
 *       FursadHub more than a job board.</li>
 * </ol>
 *
 * <p><strong>Honest early-stage trust.</strong> Earlier versions led with platform counts ("5
 * published internships, 3 partner organizations") and a row of "Awaiting approved testimonials"
 * placeholders. Both are gone: the trust section states what the product guarantees, the
 * organizations shown are the real verified directory, and community stories appear only once a
 * moderator has published one. Nothing on this page is illustrative data.
 */
export function HomePage() {
  const latest = useQuery({
    queryKey: ['public-opportunities', 'featured'],
    queryFn: () => publicOpportunityApi.listPublicOpportunities({ page: 0, size: 6 }),
  })
  const organizations = useQuery({
    queryKey: ['public-organizations', 'home'],
    queryFn: () => organizationApi.listMostActivePublicOrganizations(),
  })

  return (
    <PublicBookmarks ids={latest.data?.content.map((item) => item.id) ?? []}>
      <div className="bg-background">
        <Hero />
        <TrustSection organizations={organizations.data?.content ?? []} />
        <LatestInternships query={latest} />
        <JourneySection />
        <RolesSection />
        <LifecycleSection />
        <PublicContainer>
          <TestimonialWall />
        </PublicContainer>
        <ClosingCallToAction />
      </div>
    </PublicBookmarks>
  )
}

/* ------------------------------------------------------------------------------------------ hero */

/**
 * Value proposition, then the one primary action: searching the marketplace. The search form drives
 * the internships page through its URL, so a search here and a search there are the same search.
 */
function Hero() {
  const { t } = useTranslation()
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

  return (
    <section className="border-b border-border bg-surface">
      <PublicContainer className="grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:py-20">
        <div className="min-w-0 animate-hero-fade motion-reduce:animate-none">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-caption font-semibold text-foreground-secondary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-accent" />
            {t('common:landing.eyebrow')}
          </p>
          <h1 className="mt-5 font-display text-display-xl text-foreground">
            <span className="block">{t('common:landing.hero2.titleLead')}</span>
            <span className="block">
              {t('common:landing.hero2.titleBuild')} <span className="text-brand-accent-ink">{t('common:landing.hero2.titleAccent')}</span>
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-body-lg text-foreground-secondary">{t('common:landing.subhead')}</p>

          <form
            onSubmit={submit}
            role="search"
            aria-label={t('common:landing.hero2.searchLabel')}
            className="mt-8 grid gap-2 rounded-xl border border-border bg-background p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <SearchInput
              label={t('common:landing.hero2.searchLabel')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('common:landing.hero2.searchPlaceholder')}
              className="h-12"
              // The keyword is the main query, so it always gets a row of its own — a 9rem field
              // truncated its own placeholder to "Search internsh…".
              wrapperClassName="sm:col-span-2 lg:col-span-full"
            />
            <Input
              aria-label={t('common:landing.hero2.locationLabel')}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('common:landing.hero2.locationPlaceholder')}
              className="h-12"
            />
            <Select
              aria-label={t('common:landing.hero2.workModeLabel')}
              value={workMode}
              onChange={(event) => setWorkMode(event.target.value as WorkMode | '')}
              className="h-12"
            >
              <option value="">{t('common:landing.hero2.allWorkModes')}</option>
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

          <a
            href="#how-it-works"
            className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {t('common:landing.secondaryCta')}
            <Icon name="arrowRight" className="size-4 rtl:rotate-180" />
          </a>
        </div>

        <div className="min-w-0 animate-hero-fade motion-reduce:animate-none">
          <HomeHeroIllustration />
        </div>
      </PublicContainer>
    </section>
  )
}

/* ----------------------------------------------------------------------------------------- trust */

const TRUST_ITEMS: { key: string; icon: IconName }[] = [
  { key: 'institutions', icon: 'shield' },
  { key: 'enrollment', icon: 'idCard' },
  { key: 'pipeline', icon: 'layers' },
  { key: 'completion', icon: 'badgeCheck' },
]

/**
 * Credibility from what the product enforces, not from how big it is. Each statement maps to a rule
 * in the platform (institution verification, university-confirmed enrollment, the unified candidacy
 * pipeline, dual supervision). The organization row is the live public directory and is omitted
 * entirely when there is nothing in it.
 */
function TrustSection({ organizations }: { organizations: PublicOrganizationSummaryResponse[] }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="trust-heading" className="py-14 lg:py-20">
      <PublicContainer>
        <Reveal>
          <h2 id="trust-heading" className={`${SECTION_TITLE} max-w-2xl`}>
            {t('common:home.trust.title')}
          </h2>
        </Reveal>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item, index) => (
            <Reveal as="li" key={item.key} index={index} className="min-w-0">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-navy-soft text-brand-navy dark:text-foreground">
                <Icon name={item.icon} className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title-panel text-foreground">{t(`common:home.trust.items.${item.key}.title`)}</h3>
              <p className="mt-1.5 text-body text-foreground-secondary">{t(`common:home.trust.items.${item.key}.body`)}</p>
            </Reveal>
          ))}
        </ul>

        {organizations.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h3 className="text-label text-foreground-secondary">{t('common:home.organizations.title')}</h3>
              <Link to="/organizations" className="inline-flex items-center gap-1 rounded-sm text-label text-link hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                {t('common:landing.verifiedOrganizations.viewAll')}
                <Icon name="arrowRight" className="size-3.5 rtl:rotate-180" />
              </Link>
            </div>
            <ul className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
              {organizations.slice(0, 8).map((organization) => (
                <li key={organization.id} className="min-w-0">
                  <Link
                    to={`/organizations/${organization.id}`}
                    className="flex items-center gap-2.5 rounded-md py-1 pe-1 text-foreground transition-colors duration-150 hover:text-brand-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                  >
                    <Avatar
                      name={organization.name}
                      src={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : undefined}
                      size="sm"
                      shape="square"
                    />
                    <span className="break-words text-body font-semibold">{organization.name}</span>
                    {organization.verified && <VerifiedBadge size="sm" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PublicContainer>
    </section>
  )
}

/* ------------------------------------------------------------------------------------- internships */

function LatestInternships({ query }: { query: UseQueryResult<PageResponse<PublicOpportunityResponse>> }) {
  const { t } = useTranslation()
  const items = query.data?.content ?? []

  return (
    <section aria-labelledby="latest-heading" className="border-y border-border bg-surface py-14 lg:py-20">
      <PublicContainer>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h2 id="latest-heading" className={SECTION_TITLE}>
              {t('common:home.latest.title')}
            </h2>
            <p className="mt-2 text-body-lg text-foreground-secondary">{t('common:home.latest.description')}</p>
          </div>
          {items.length > 0 && (
            <ButtonLink to="/opportunities" variant="outline">
              {t('common:landing.featured.viewAll')}
              <Icon name="arrowRight" className="size-4 rtl:rotate-180" />
            </ButtonLink>
          )}
        </div>

        <div className="mt-8">
          {query.isError ? (
            // A secondary section failing is a quiet line, not a red box in the middle of the page.
            <ErrorState
              variant="inline"
              title={t('opportunities:public.error')}
              onRetry={() => void query.refetch()}
            />
          ) : query.isLoading ? (
            <OpportunityGridSkeleton count={3} />
          ) : items.length > 0 ? (
            <ul className={OPPORTUNITY_GRID}>
              {items.map((opportunity, index) => (
                <Reveal as="li" key={opportunity.id} index={index} className="min-w-0">
                  <PublicOpportunityCard opportunity={opportunity} />
                </Reveal>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="briefcase"
              title={t('common:home.latest.emptyTitle')}
              description={t('common:home.latest.emptyBody')}
            />
          )}
        </div>
      </PublicContainer>
    </section>
  )
}

/* ---------------------------------------------------------------------------------------- journey */

const JOURNEY_STEPS = ['sourcing', 'recruitment', 'placement'] as const
const JOURNEY_ICONS: Record<(typeof JOURNEY_STEPS)[number], IconName> = {
  sourcing: 'briefcase',
  recruitment: 'users',
  placement: 'badgeCheck',
}

/**
 * The end-to-end journey in three numbered steps, drawn as one connected sequence rather than three
 * unrelated boxes: discover or be nominated, one shared candidate pipeline, then placement through
 * to completion.
 */
function JourneySection() {
  const { t } = useTranslation()
  return (
    <section id="how-it-works" aria-labelledby="journey-heading" className="scroll-mt-20 py-14 lg:py-20">
      <PublicContainer>
        <Reveal className="max-w-2xl">
          <h2 id="journey-heading" className={SECTION_TITLE}>
            {t('common:landing.ecosystem.title')}
          </h2>
          <p className="mt-3 text-body-lg text-foreground-secondary">{t('common:landing.ecosystem.subtitle')}</p>
        </Reveal>

        <ol className="relative mt-12 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {/* The connecting rule: vertical beside the steps on a phone, horizontal through the
              numbers from `lg`. Decorative. */}
          <span aria-hidden="true" className="absolute inset-y-6 start-6 w-px bg-border lg:inset-x-6 lg:inset-y-auto lg:top-6 lg:h-px lg:w-auto" />
          {JOURNEY_STEPS.map((step, index) => (
            <Reveal as="li" key={step} index={index} className="relative flex gap-5 lg:block">
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-background font-display text-title-section text-brand-accent-ink">
                {index + 1}
              </span>
              <div className="min-w-0 lg:mt-6">
                <h3 className="flex items-center gap-2 font-display text-title-section text-foreground">
                  <Icon name={JOURNEY_ICONS[step]} className="size-5 shrink-0 text-muted" />
                  {t(`common:landing.howItWorks.steps.${step}.title`)}
                </h3>
                <p className="mt-2 text-body-lg text-foreground-secondary">{t(`common:landing.howItWorks.steps.${step}.body`)}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </PublicContainer>
    </section>
  )
}

/* ------------------------------------------------------------------------------------------ roles */

const ROLES = [
  { key: 'student', icon: 'graduationCap', to: '/opportunities', cta: 'common:landing.doors.student.cta' },
  { key: 'organization', icon: 'building', to: '/register?role=organization', cta: 'common:landing.works.organization.cta' },
  { key: 'university', icon: 'bank', to: '/register?role=university', cta: 'common:landing.works.university.cta' },
] as const

/**
 * Why each role would use FursadHub, as three parallel columns separated by rules rather than three
 * boxed cards. Each benefit is a feature that exists today. The student path leads into the
 * marketplace — browsing internships is the student-facing action; organizations and universities
 * are invited to register their institution.
 */
function RolesSection() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="roles-heading" className="border-y border-border bg-surface py-14 lg:py-20">
      <PublicContainer>
        <Reveal>
          <h2 id="roles-heading" className={SECTION_TITLE}>
            {t('common:home.roles.title')}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-border rtl:lg:divide-x-reverse">
          {ROLES.map((role, index) => (
            <Reveal key={role.key} index={index} className="flex min-w-0 flex-col lg:px-8 lg:first:ps-0 lg:last:pe-0">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-accent-soft text-brand-accent-ink">
                <Icon name={role.icon} className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title-section text-foreground">{t(`common:landing.doors.${role.key}.title`)}</h3>
              <p className="mt-2 text-body text-foreground-secondary">{t(`common:landing.doors.${role.key}.body`)}</p>
              <ul className="mt-5 space-y-2.5">
                {(t(`common:landing.works.${role.key}.points`, { returnObjects: true }) as string[]).map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-body text-foreground">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="min-w-0">{point}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={role.to}
                className="mt-6 inline-flex items-center gap-1.5 self-start rounded-sm text-body font-semibold text-brand-accent-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {t(role.cta)}
                <Icon name="arrowRight" className="size-4 rtl:rotate-180" />
              </Link>
            </Reveal>
          ))}
        </div>
      </PublicContainer>
    </section>
  )
}

/* -------------------------------------------------------------------------------------- lifecycle */

const LIFECYCLE: { key: string; label: string; icon: IconName }[] = [
  { key: 'logs', label: 'common:landing.lifecycle.items.logs', icon: 'clipboard' },
  { key: 'attendance', label: 'common:landing.lifecycle.items.attendance', icon: 'calendar' },
  { key: 'supervision', label: 'common:landing.lifecycle.items.supervision', icon: 'users' },
  { key: 'evaluation', label: 'common:landing.lifecycle.items.evaluation', icon: 'badgeCheck' },
  { key: 'finalReport', label: 'common:home.lifecycle.finalReport', icon: 'document' },
  { key: 'defense', label: 'common:landing.lifecycle.items.defense', icon: 'graduationCap' },
]

/**
 * What the platform does AFTER the offer — the strategic differentiator. Every stage listed is a
 * module that exists: weekly logs, attendance, supervision, evaluation, final report and defense.
 */
function LifecycleSection() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="lifecycle-heading" className="surface-dark bg-surface py-14 text-foreground lg:py-20">
      <PublicContainer className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <Reveal className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-accent-ink">{t('common:home.lifecycle.eyebrow')}</p>
          <h2 id="lifecycle-heading" className={`${SECTION_TITLE} mt-3`}>
            {t('common:landing.lifecycle.title')}
          </h2>
          <p className="mt-4 text-body-lg text-foreground-secondary">{t('common:landing.lifecycle.body')}</p>
        </Reveal>
        <ol className="grid gap-3 sm:grid-cols-2">
          {LIFECYCLE.map((stage, index) => (
            <Reveal
              as="li"
              key={stage.key}
              index={index}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3.5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-raised text-brand-accent-ink">
                <Icon name={stage.icon} className="size-4" />
              </span>
              <span className="min-w-0 break-words text-body font-semibold">{t(stage.label)}</span>
            </Reveal>
          ))}
        </ol>
      </PublicContainer>
    </section>
  )
}

/* ---------------------------------------------------------------------------------------- closing */

/**
 * One closing ask, with a single primary action. Hidden from a signed-in visitor, who already has an
 * account and gets their account menu in the header instead.
 */
function ClosingCallToAction() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return null
  return (
    <section aria-labelledby="closing-heading" className="py-16 lg:py-24">
      <PublicContainer>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="closing-heading" className={SECTION_TITLE}>
            {t('common:landing.cta.title')}
          </h2>
          <p className="mt-4 text-body-lg text-foreground-secondary">{t('common:landing.cta.body')}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink to="/register" size="lg" className="w-full sm:w-auto">
              {t('common:landing.cta.primary')}
            </ButtonLink>
            <Link
              to="/login"
              className="inline-flex h-12 items-center rounded-md px-4 text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {t('common:landing.cta.secondary')}
            </Link>
          </div>
        </Reveal>
      </PublicContainer>
    </section>
  )
}
