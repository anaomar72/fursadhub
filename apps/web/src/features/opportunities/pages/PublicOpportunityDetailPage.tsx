import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import * as organizationApi from '../../organization/api/organizationApi'
import { useStudentMarketplaceAccess } from '../../student/hooks/useStudentMarketplaceAccess'
import { Avatar, Badge, Card, Icon, LoadingSpinner, Reveal, VerifiedBadge, type IconName } from '../../../components/ui'
import { SectionNavigation, ExplanatoryArtwork } from '../../../components/ui/Presentation'
import { ShareLink } from '../../../components/ui/ShareLink'
import { PublicBookmarks, PublicBookmark } from '../../student/components/PublicBookmarks'
import { OpportunityEnrichment } from '../components/OpportunityEnrichment'
import { formatCompensation } from '../compensation'
import { similarOpportunities } from '../similarOpportunities'

/**
 * The approved public internship detail page (design-reference/presentation-refresh-2026,
 * reference 03): a back link, the organization identity block above the role title, the fact strip,
 * the long-form content, and a sticky right column carrying the apply panel and the organization
 * summary.
 *
 * Organization cover media and B3 compensation, hours, skills and perks are read from the API.
 * Similar-internship recommendations are not claimed because no recommendation endpoint exists.
 */
export function PublicOpportunityDetailPage() {
  const { t, i18n } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const [now] = useState(() => Date.now())
  const locale = i18n.resolvedLanguage === 'so' ? 'so-SO' : 'en'

  const opportunityQuery = useQuery({
    queryKey: ['public-opportunities', 'detail', opportunityId],
    queryFn: () => publicOpportunityApi.getPublicOpportunity(opportunityId!),
    enabled: !!opportunityId,
    retry: false,
  })

  const organizationId = opportunityQuery.data?.organization.id
  const similarQuery = useQuery({
    queryKey: ['public-opportunities', 'similar-pool'],
    queryFn: () => publicOpportunityApi.listPublicOpportunities({ page: 0, size: 50 }),
    enabled: !!opportunityQuery.data,
  })
  const organizationQuery = useQuery({
    queryKey: ['public-organization', organizationId],
    queryFn: () => organizationApi.getPublicOrganization(organizationId!),
    enabled: !!organizationId,
    retry: false,
  })

  if (opportunityQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" label={t('common:status.loading')} />
      </div>
    )
  }

  if (opportunityQuery.isError || !opportunityQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground-secondary">{t('opportunities:public.notFound')}</p>
        <Link to="/opportunities" className="mt-4 inline-block text-sm font-semibold text-link hover:underline">
          {t('opportunities:public.backToList')}
        </Link>
      </div>
    )
  }

  const opportunity = opportunityQuery.data
  const similar = similarOpportunities(opportunity, similarQuery.data?.content ?? [], new Date(now).toISOString().slice(0, 10))
  const organization = organizationQuery.data
  const pay = formatCompensation(opportunity.compensation, t, locale)
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))

  const deadlineNotice = (() => {
    if (!opportunity.applicationDeadline) return null
    const days = Math.ceil(
      (new Date(`${opportunity.applicationDeadline}T23:59:59Z`).getTime() - now) / 86_400_000,
    )
    if (days < 0) return t('opportunities:public.closed')
    if (days === 0) return t('opportunities:public.closesToday')
    return t('opportunities:public.closesIn', { count: days })
  })()

  const facts: { key: string; icon: IconName; label: string; value: string }[] = [
    ...(pay ? [{ key: 'pay', icon: 'coins' as const, label: t('opportunities:enrichment.compensationLabel'), value: pay }] : []),
    ...(opportunity.hoursPerWeek ? [{ key: 'hours', icon: 'clock' as const, label: t('opportunities:enrichment.hoursPerWeekLabel'), value: String(opportunity.hoursPerWeek) }] : []),
    ...(opportunity.publishedAt ? [{ key: 'posted', icon: 'document' as const, label: t('opportunities:public.facts.posted'), value: formatDate(opportunity.publishedAt) }] : []),
    {
      key: 'workMode',
      icon: 'briefcase',
      label: t('opportunities:public.facts.workMode'),
      value: t(`opportunities:workModeValues.${opportunity.workMode}`),
    },
    ...(opportunity.location
      ? [
          {
            key: 'location',
            icon: 'globe' as const,
            label: t('opportunities:public.facts.location'),
            value: opportunity.location,
          },
        ]
      : []),
    {
      key: 'openings',
      icon: 'users',
      label: t('opportunities:public.facts.openings'),
      value: String(opportunity.numberOfOpenings),
    },
    { key: 'start', icon: 'clipboard', label: t('opportunities:public.facts.start'), value: formatDate(opportunity.startDate) },
    { key: 'end', icon: 'clipboard', label: t('opportunities:public.facts.end'), value: formatDate(opportunity.endDate) },
    ...(opportunity.applicationDeadline
      ? [
          {
            key: 'deadline',
            icon: 'document' as const,
            label: t('opportunities:public.facts.deadline'),
            value: formatDate(opportunity.applicationDeadline),
          },
        ]
      : []),
  ]

  return (
    <PublicBookmarks ids={[opportunity.id]}><div className="mx-auto w-full max-w-[1448px] px-4 py-6 sm:px-6 lg:px-12">
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-2 rounded text-sm font-semibold text-link transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
      >
        <Icon name="chevronLeft" className="size-4" />
        {t('opportunities:public.backToList')}
      </Link>

      {/*
        `min-w-0` on both grid items is what makes this page fit a phone at all.

        <p>A grid item's default `min-width` is `auto`, which means it refuses to shrink below the
        intrinsic minimum width of its own contents. The section-navigation strip inside the article
        is a non-wrapping row about 470px wide; with `min-width: auto` that number propagated all
        the way up and held the whole page open at 529px inside a 360px viewport. The strip's own
        `overflow-x: auto` could never engage, because nothing above it would let it be narrow.

        <p>Nothing was visibly broken only because the public shell clips horizontal overflow, which
        also meant `documentElement.scrollWidth` reported no overflow — the page was cut off rather
        than scrollable, and the automated width checks read that as passing.
      */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <article className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-5">
          {/* Composition-level, not paragraph-level: identity and key facts arrive as one piece,
              then the body copy follows. The sticky apply rail below is deliberately NOT wrapped —
              a transform on an ancestor breaks `position: sticky`, and the primary action should
              be there the instant the page is. */}
          <Reveal>
            {/*
              The identity row wraps on a phone instead of holding three columns side by side.

              <p>It was a single non-wrapping row: a 96px logo, the title block, and the share and
              bookmark buttons pushed to the end. Inside a 360px viewport that left the title roughly
              40px of usable width — so "Full stack Internship" ran past the edge of the card and was
              cut off by the shell's clip. The logo shrinks to 56px below `sm` and the actions drop
              onto their own line, which gives the title the full column width to wrap into.

              <p>`shrink-0` on the logo is deliberate: without it the flex algorithm takes the space
              back out of the image instead of the text, squashing a square logo into a letterbox.
            */}
            <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap sm:gap-4">
              <Avatar
                name={opportunity.organization.name}
                src={
                  organization?.hasLogo ? organizationApi.organizationLogoUrl(opportunity.organization.id) : undefined
                }
                size="lg"
                shape="square"
                className="size-14 shrink-0 sm:size-24"
              />
              <div className="min-w-0 flex-1 basis-[12rem]">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <Link
                    to={`/organizations/${opportunity.organization.id}`}
                    className="rounded font-display text-base font-extrabold tracking-tight text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring dark:text-foreground"
                  >
                    {opportunity.organization.name}
                  </Link>
                  {opportunity.organization.verified && <VerifiedBadge size="sm" />}
                </div>
                {/* `break-words` so a single long unbroken word — which job titles do contain —
                    wraps rather than pushing the column open again. */}
                <h1 className="mt-2 break-words font-display text-xl font-extrabold tracking-[-0.03em] text-brand-navy dark:text-foreground sm:text-2xl lg:text-3xl">
                  {opportunity.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="brand">{t(`opportunities:workModeValues.${opportunity.workMode}`)}</Badge>
                  {opportunity.location && <Badge>{opportunity.location}</Badge>}
                </div>
              </div>
              {/* `ms-auto` only once the row is a single line; while it is wrapped, the actions sit
                  at the start of their own line rather than being pushed to the far edge. */}
              <div className="flex shrink-0 flex-wrap gap-2 sm:ms-auto"><ShareLink /><PublicBookmark id={opportunity.id} /></div>
            </div>

            {/* Framed rather than bare. Organizations upload whatever they have, and a logo on a white
                 ground — which is most of them — otherwise butts straight against the page with no
                 edge at all, which reads as a hole punched in the layout rather than as a cover.
                 The hairline and the muted backing give any image, transparent ones included, a
                 boundary in both themes. */}
            {/*
              The cover's aspect ratio is responsive, because a fixed one crops by width.

              <p>3.7:1 is the approved desktop banner shape, and it is right there. On a phone the
              same ratio meant a 360px-wide box only 97px tall: organizations upload roughly square
              artwork, so `object-fit: cover` threw away about two thirds of its height and what
              survived was usually the middle of a logo. The ratio now opens up as the viewport
              narrows — 16:9 on a phone, 2.5:1 on a tablet, the approved 3.7:1 from `lg` — so the
              image is cropped least exactly where there is least room to crop it.
            */}
            {organization?.hasCover ? <img src={organizationApi.organizationCoverUrl(organization.id)} alt="" loading="lazy" decoding="async" className="mt-5 aspect-[16/9] w-full max-w-full rounded-lg border border-border bg-surface-muted object-cover sm:aspect-[2.5/1] lg:aspect-[3.7/1]" /> :<div className="mt-5 flex min-h-40 flex-wrap items-center justify-center gap-4 overflow-hidden rounded-lg bg-brand-blue-soft p-4 sm:min-h-52 sm:flex-nowrap sm:gap-5 sm:p-5"><ExplanatoryArtwork kind="opportunity" className="w-32 max-w-[45%] sm:w-52" /><div className="min-w-0 max-w-sm"><p className="font-display text-lg font-extrabold text-brand-navy sm:text-xl">{t('common:remediation.opportunityTitle')}</p><p className="mt-2 text-xs leading-5 text-foreground-secondary">{t('common:remediation.opportunityBody')}</p></div></div>}

            <dl className="mt-5 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3 xl:grid-cols-5">
              {facts.map((fact) => (
                <div key={fact.key} className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
                    <Icon name={fact.icon} className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-foreground-secondary">{fact.label}</dt>
                    <dd className="mt-0.5 break-words text-sm font-semibold text-foreground">{fact.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Reveal>

          <SectionNavigation items={[
            { id:'overview', label:t('common:remediation.overview') },
            ...(opportunity.responsibilities ? [{id:'responsibilities',label:t('opportunities:form.responsibilitiesLabel')}] : []),
            ...(opportunity.requirements ? [{id:'requirements',label:t('opportunities:form.requirementsLabel')}] : []),
            {id:'perks',label:t('opportunities:enrichment.title')},
            {id:'organization-info',label:t('opportunities:public.aboutOrganization')},
          ]} />
          <Reveal index={1}>
            <Section id="overview" title={t('opportunities:public.aboutInternship')} body={opportunity.description} />
            {opportunity.responsibilities && (
              <Section id="responsibilities" title={t('opportunities:form.responsibilitiesLabel')} body={opportunity.responsibilities} />
            )}
            {opportunity.requirements && (
              <Section id="requirements" title={t('opportunities:form.requirementsLabel')} body={opportunity.requirements} />
            )}
            <div id="perks" className="scroll-mt-24 border-t border-border pt-5 mt-5"><OpportunityEnrichment {...opportunity} /></div>
          </Reveal>
        </article>

        <aside className="min-w-0 lg:sticky lg:top-24">
          <Card padding="lg">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
              {t('opportunities:public.applyPanelTitle')}
            </h2>
            {/* The reference runs a live countdown here. The remaining time is derived from the
                opportunity's own applicationDeadline — a real field — and stated in whole days
                rather than as a ticking clock, which would re-render every second for no gain. */}
            {deadlineNotice && (
              <p className="mt-3 rounded-lg bg-brand-accent-soft px-3 py-2 text-xs font-semibold text-brand-accent-ink">
                {deadlineNotice}
              </p>
            )}
            <ApplyCallToAction opportunityId={opportunity.id} />
            <div className="mt-3"><PublicBookmark id={opportunity.id} inline /></div>
            {opportunity.organization.verified && (
              <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
                <VerifiedBadge variant="information" className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{t('opportunities:public.verifiedOpportunity')}</p>
                  <p className="mt-0.5 text-xs leading-5 text-foreground-secondary">
                    {t('opportunities:public.verifiedOpportunityBody')}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {organization && (
            <Card padding="lg" className="mt-4 scroll-mt-24" >
              <span id="organization-info" />
              <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
                {t('opportunities:public.aboutOrganization')}
              </h2>
              <div className="mt-4 flex min-w-0 items-center gap-3">
                <Avatar
                  name={organization.name}
                  src={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : undefined}
                  shape="square"
                />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-brand-navy dark:text-foreground">{organization.name}</p>
                    {organization.verified && <VerifiedBadge size="sm" />}
                  </div>
                  {organization.city && (
                    <p className="mt-0.5 truncate text-xs text-foreground-secondary">{organization.city}</p>
                  )}
                </div>
              </div>
              {(organization.shortDescription ?? organization.description) && (
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-foreground-secondary">
                  {organization.shortDescription ?? organization.description}
                </p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                {organization.companySizeRange && <div><dt className="text-xs text-muted">{t('organization:profile.companySizeLabel')}</dt><dd className="mt-1 text-sm font-bold">{t(`organization:profile.companySizeValues.${organization.companySizeRange}`)}</dd></div>}
                {organization.foundedYear && <div><dt className="text-xs text-muted">{t('organization:profile.foundedYearLabel')}</dt><dd className="mt-1 text-sm font-bold">{organization.foundedYear}</dd></div>}
              </dl>
              <Link
                to={`/organizations/${organization.id}`}
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border-strong text-sm font-semibold text-foreground transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
              >
                {t('opportunities:public.viewOrganizationProfile')}
                <Icon name="chevronRight" className="size-4" />
              </Link>
            </Card>
          )}
        </aside>
      </div>
      {similar.length > 0 && <Reveal as="section" className="mt-8 border-t border-border pt-6" aria-labelledby="similar-internships">
        <h2 id="similar-internships" className="font-display text-xl font-extrabold text-brand-navy dark:text-foreground">{t('common:similar.title')}</h2>
        <p className="mt-1 text-sm text-foreground-secondary">{t('common:similar.description')}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">{similar.map((item) => <Link key={item.id} to={`/opportunities/${item.id}`} className="rounded-xl border border-border bg-surface p-5 shadow-xs hover:border-brand-blue focus-visible:ring-2 focus-visible:ring-focus-ring">
          <p className="text-xs text-muted">{item.organization.name}</p><h3 className="mt-2 font-bold text-brand-navy dark:text-foreground">{item.title}</h3><p className="mt-3 text-sm text-foreground-secondary">{[item.location, t(`opportunities:workModeValues.${item.workMode}`)].filter(Boolean).join(' · ')}</p>
        </Link>)}</div>
      </Reveal>}
    </div>
    </PublicBookmarks>
  )
}

/**
 * Phase 4 entry point into the application flow.
 *
 * <p>Only PUBLIC/HYBRID opportunities ever reach this page (the public endpoint excludes
 * targeted-only ones by construction), so the CTA is always appropriate here. Signed-out visitors
 * are sent to log in first; whether they may actually apply — verified enrollment, deadline,
 * availability — is decided by the backend, never here (CLAUDE.md section 24).
 */
function ApplyCallToAction({ opportunityId }: { opportunityId: string }) {
  const { t } = useTranslation()
  const { isAuthenticated, canAct, isLoading } = useStudentMarketplaceAccess()

  if (isLoading) return <div className="mt-4"><LoadingSpinner label={t('common:status.loading')} /></div>
  if (isAuthenticated && !canAct) return <p className="mt-4 text-sm text-foreground-secondary">{t('common:remediation.studentActionsOnly')}</p>

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand-accent px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
      >
        {t('opportunities:public.signInToApply')}
      </Link>
    )
  }

  return (
    <Link
      to={`/student/opportunities/${opportunityId}/apply`}
      className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand-accent px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
    >
      {t('opportunities:public.apply')}
    </Link>
  )
}

function Section({ title, body, id }: { title: string; body: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-6 scroll-mt-24 first:mt-0">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
        {title}
      </h2>
      <p className="mt-2.5 whitespace-pre-line text-sm leading-7 text-foreground-secondary">{body}</p>
    </section>
  )
}
