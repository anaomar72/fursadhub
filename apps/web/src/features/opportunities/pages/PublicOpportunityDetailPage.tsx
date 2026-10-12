import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import * as organizationApi from '../../organization/api/organizationApi'
import { useStudentMarketplaceAccess } from '../../student/hooks/useStudentMarketplaceAccess'
import { Avatar, ButtonLink, EmptyState, Icon, Reveal, Skeleton, SkeletonRegion, SkeletonText, VerifiedBadge, type IconName } from '../../../components/ui'
import { ShareLink } from '../../../components/ui/ShareLink'
import { PublicContainer } from '../../../app/layouts/PublicContainer'
import { PublicBookmarks, PublicBookmark } from '../../student/components/PublicBookmarks'
import { OpportunityEnrichment } from '../components/OpportunityEnrichment'
import { OPPORTUNITY_GRID, PublicOpportunityCard } from '../components/PublicOpportunityCard'
import { formatCompensation } from '../compensation'
import { similarOpportunities } from '../similarOpportunities'

/**
 * The public internship listing.
 *
 * <p>Hierarchy, top to bottom: who is offering it, the role, where/how and the deadline — in a page
 * header band — then the long-form content beside a supporting column that carries the decision:
 * apply, the deadline, and the key facts.
 *
 * <p><strong>Mobile order is deliberate.</strong> The supporting column comes FIRST in the DOM and is
 * placed in the right-hand column only from `lg`. On a phone a student therefore reads the title,
 * then immediately the apply action and the facts that decide whether to apply, then the
 * description — instead of scrolling past the whole description to find the button. The column is
 * sticky only on large screens, where it fits beside the content; it is never pinned over a phone's
 * viewport.
 *
 * <p>The long-form content sits on the page, not in a card, at a readable measure. Every field shown
 * comes from the public opportunity and organization payloads.
 */
export function PublicOpportunityDetailPage() {
  const { t, i18n } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const [now] = useState(() => Date.now())
  const locale = i18n.language?.startsWith('so') ? 'so-SO' : 'en'

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

  if (opportunityQuery.isLoading) return <DetailSkeleton />

  if (opportunityQuery.isError || !opportunityQuery.data) {
    return (
      <PublicContainer className="py-16 lg:py-24">
        <EmptyState
          icon="briefcase"
          title={t('opportunities:public.notFound')}
          action={
            <ButtonLink to="/opportunities" variant="outline">
              {t('opportunities:public.backToList')}
            </ButtonLink>
          }
        />
      </PublicContainer>
    )
  }

  const opportunity = opportunityQuery.data
  const similar = similarOpportunities(opportunity, similarQuery.data?.content ?? [], new Date(now).toISOString().slice(0, 10))
  const organization = organizationQuery.data
  const pay = formatCompensation(opportunity.compensation, t, locale)
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))

  const daysLeft = opportunity.applicationDeadline
    ? Math.ceil((new Date(`${opportunity.applicationDeadline}T23:59:59Z`).getTime() - now) / 86_400_000)
    : null
  const closed = daysLeft !== null && daysLeft < 0
  const deadlineNotice =
    daysLeft === null
      ? null
      : closed
        ? t('opportunities:public.closed')
        : daysLeft === 0
          ? t('opportunities:public.closesToday')
          : t('opportunities:public.closesIn', { count: daysLeft })

  const facts: { key: string; icon: IconName; label: string; value: string }[] = [
    ...(opportunity.applicationDeadline
      ? [{ key: 'deadline', icon: 'calendar' as const, label: t('opportunities:public.facts.deadline'), value: formatDate(opportunity.applicationDeadline) }]
      : []),
    { key: 'start', icon: 'calendar', label: t('opportunities:public.facts.start'), value: formatDate(opportunity.startDate) },
    { key: 'end', icon: 'calendar', label: t('opportunities:public.facts.end'), value: formatDate(opportunity.endDate) },
    ...(pay ? [{ key: 'pay', icon: 'coins' as const, label: t('opportunities:enrichment.compensationLabel'), value: pay }] : []),
    ...(opportunity.hoursPerWeek
      ? [{ key: 'hours', icon: 'clock' as const, label: t('opportunities:enrichment.hoursPerWeekLabel'), value: String(opportunity.hoursPerWeek) }]
      : []),
    { key: 'openings', icon: 'users', label: t('opportunities:public.facts.openings'), value: String(opportunity.numberOfOpenings) },
    ...(opportunity.publishedAt
      ? [{ key: 'posted', icon: 'document' as const, label: t('opportunities:public.facts.posted'), value: formatDate(opportunity.publishedAt) }]
      : []),
  ]

  return (
    <PublicBookmarks ids={[opportunity.id]}>
      <div className="bg-background">
        {/* ------------------------------------------------------------------ header band */}
        <section className="border-b border-border bg-surface">
          <PublicContainer className="py-8 lg:py-12">
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-1.5 rounded-sm text-label text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              <Icon name="chevronLeft" className="size-4 rtl:rotate-180" />
              {t('opportunities:public.backToList')}
            </Link>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 flex-1 basis-[18rem] items-center gap-4">
                <Avatar
                  name={opportunity.organization.name}
                  src={organization?.hasLogo ? organizationApi.organizationLogoUrl(opportunity.organization.id) : undefined}
                  size="lg"
                  shape="square"
                  className="size-14 shrink-0 sm:size-16"
                />
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <Link
                    to={`/organizations/${opportunity.organization.id}`}
                    className="break-words rounded-sm text-body-lg font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {opportunity.organization.name}
                  </Link>
                  {opportunity.organization.verified && <VerifiedBadge size="sm" />}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <ShareLink />
                <PublicBookmark id={opportunity.id} />
              </div>
            </div>

            <h1 className="mt-6 max-w-4xl break-words font-display text-display-lg text-foreground">{opportunity.title}</h1>

            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-body text-foreground-secondary">
              {opportunity.location && (
                <li className="flex min-w-0 items-center gap-1.5">
                  <Icon name="mapPin" className="size-4 shrink-0 text-muted" />
                  <span className="break-words">{opportunity.location}</span>
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <Icon name="briefcase" className="size-4 shrink-0 text-muted" />
                {t(`opportunities:workModeValues.${opportunity.workMode}`)}
              </li>
              {deadlineNotice && (
                <li>
                  <span
                    className={
                      closed
                        ? 'inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-muted px-2.5 py-1 text-caption font-semibold text-foreground-secondary'
                        : 'inline-flex items-center gap-1.5 rounded-full border border-brand-accent/25 bg-brand-accent-soft px-2.5 py-1 text-caption font-semibold text-brand-accent-ink'
                    }
                  >
                    <Icon name="clock" className="size-3.5 shrink-0" />
                    {deadlineNotice}
                  </span>
                </li>
              )}
            </ul>
          </PublicContainer>
        </section>

        {/* ------------------------------------------------------------------ body */}
        <PublicContainer className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:py-14">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-title-panel text-foreground">{t('opportunities:public.applyPanelTitle')}</h2>
              {closed ? (
                <p className="mt-3 text-body text-foreground-secondary">{t('opportunities:public.closedBody')}</p>
              ) : (
                <ApplyCallToAction opportunityId={opportunity.id} />
              )}
              <div className="mt-3">
                <PublicBookmark id={opportunity.id} inline />
              </div>

              <h3 className="mt-6 border-t border-border pt-5 text-label text-foreground-secondary">{t('opportunities:public.keyDetails')}</h3>
              <dl className="mt-3 grid gap-3">
                {facts.map((fact) => (
                  <div key={fact.key} className="flex items-start gap-3">
                    <Icon name={fact.icon} className="mt-0.5 size-4 shrink-0 text-muted" />
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                      <dt className="text-body text-foreground-secondary">{fact.label}</dt>
                      <dd className="break-words text-body font-semibold text-foreground">{fact.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              {opportunity.organization.verified && (
                <div className="mt-6 flex items-start gap-3 border-t border-border pt-5">
                  <VerifiedBadge size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-label text-foreground">{t('opportunities:public.verifiedOpportunity')}</p>
                    <p className="mt-0.5 text-caption text-foreground-secondary">{t('opportunities:public.verifiedOpportunityBody')}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <article className="min-w-0 lg:col-start-1 lg:row-start-1">
            {organization?.hasCover && (
              <img
                src={organizationApi.organizationCoverUrl(organization.id)}
                alt=""
                loading="lazy"
                decoding="async"
                className="mb-10 aspect-[16/9] w-full rounded-xl border border-border bg-surface-muted object-cover sm:aspect-[2.5/1]"
              />
            )}
            <Reveal>
              <ContentSection id="overview" title={t('opportunities:public.aboutInternship')} body={opportunity.description} />
              {opportunity.responsibilities && (
                <ContentSection id="responsibilities" title={t('opportunities:form.responsibilitiesLabel')} body={opportunity.responsibilities} />
              )}
              {opportunity.requirements && (
                <ContentSection id="requirements" title={t('opportunities:form.requirementsLabel')} body={opportunity.requirements} />
              )}
              <div id="perks" className="mt-10 scroll-mt-24 border-t border-border pt-8">
                <OpportunityEnrichment {...opportunity} />
              </div>
            </Reveal>

            {organization && (
              <section id="organization-info" aria-labelledby="organization-heading" className="mt-10 scroll-mt-24 border-t border-border pt-8">
                <h2 id="organization-heading" className="font-display text-title-section text-foreground">
                  {t('opportunities:public.aboutOrganization')}
                </h2>
                <div className="mt-5 flex min-w-0 items-center gap-3">
                  <Avatar
                    name={organization.name}
                    src={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : undefined}
                    shape="square"
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="break-words text-body font-semibold text-foreground">{organization.name}</p>
                      {organization.verified && <VerifiedBadge size="sm" />}
                    </div>
                    {organization.city && <p className="mt-0.5 text-caption text-foreground-secondary">{organization.city}</p>}
                  </div>
                </div>
                {(organization.shortDescription ?? organization.description) && (
                  <p className="mt-4 max-w-prose text-body-lg text-foreground-secondary">
                    {organization.shortDescription ?? organization.description}
                  </p>
                )}
                {(organization.companySizeRange || organization.foundedYear) && (
                  <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
                    {organization.companySizeRange && (
                      <div>
                        <dt className="text-caption text-foreground-secondary">{t('organization:profile.companySizeLabel')}</dt>
                        <dd className="mt-0.5 text-body font-semibold text-foreground">
                          {t(`organization:profile.companySizeValues.${organization.companySizeRange}`)}
                        </dd>
                      </div>
                    )}
                    {organization.foundedYear && (
                      <div>
                        <dt className="text-caption text-foreground-secondary">{t('organization:profile.foundedYearLabel')}</dt>
                        <dd className="mt-0.5 text-body font-semibold text-foreground">{organization.foundedYear}</dd>
                      </div>
                    )}
                  </dl>
                )}
                <ButtonLink to={`/organizations/${organization.id}`} variant="outline" className="mt-6">
                  {t('opportunities:public.viewOrganizationProfile')}
                  <Icon name="arrowRight" className="size-4 rtl:rotate-180" />
                </ButtonLink>
              </section>
            )}
          </article>
        </PublicContainer>

        {similar.length > 0 && (
          <section aria-labelledby="similar-internships" className="border-t border-border bg-surface">
            <PublicContainer className="py-10 lg:py-14">
              <h2 id="similar-internships" className="font-display text-title-section text-foreground">
                {t('common:similar.title')}
              </h2>
              <p className="mt-1 text-body text-foreground-secondary">{t('common:similar.description')}</p>
              <ul className={`mt-6 ${OPPORTUNITY_GRID}`}>
                {similar.map((item, index) => (
                  <Reveal as="li" key={item.id} index={index} className="min-w-0">
                    <PublicOpportunityCard opportunity={item} density="compact" />
                  </Reveal>
                ))}
              </ul>
            </PublicContainer>
          </section>
        )}
      </div>
    </PublicBookmarks>
  )
}

/**
 * Entry into the application flow.
 *
 * <p>Only PUBLIC/HYBRID opportunities ever reach this page (the public endpoint excludes
 * targeted-only ones by construction). Signed-out visitors are sent to sign in first; whether they
 * may actually apply — verified enrollment, deadline, availability — is decided by the backend,
 * never here (CLAUDE.md section 24).
 */
function ApplyCallToAction({ opportunityId }: { opportunityId: string }) {
  const { t } = useTranslation()
  const { isAuthenticated, canAct, isLoading } = useStudentMarketplaceAccess()

  if (isLoading) {
    return (
      <SkeletonRegion className="mt-4">
        <Skeleton className="h-12 w-full rounded-md" />
      </SkeletonRegion>
    )
  }
  if (isAuthenticated && !canAct) {
    return <p className="mt-3 text-body text-foreground-secondary">{t('common:remediation.studentActionsOnly')}</p>
  }

  return (
    <ButtonLink
      to={isAuthenticated ? `/student/opportunities/${opportunityId}/apply` : '/login'}
      size="lg"
      className="mt-4 h-auto min-h-12 w-full whitespace-normal py-2.5 text-center"
    >
      {isAuthenticated ? t('opportunities:public.apply') : t('opportunities:public.signInToApply')}
    </ButtonLink>
  )
}

function ContentSection({ title, body, id }: { title: string; body: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24 first:mt-0">
      <h2 className="font-display text-title-section text-foreground">{title}</h2>
      <p className="mt-3 max-w-prose whitespace-pre-line break-words text-body-lg text-foreground-secondary">{body}</p>
    </section>
  )
}

/** The page's shape while the opportunity loads: header band, then content beside the side column. */
function DetailSkeleton() {
  return (
    <div className="bg-background">
      <SkeletonRegion className="border-b border-border bg-surface">
        <PublicContainer className="py-8 lg:py-12">
          <Skeleton className="h-4 w-40" />
          <div className="mt-6 flex items-center gap-4">
            <Skeleton className="size-14 rounded-lg sm:size-16" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="mt-6 h-9 w-3/4 max-w-xl" />
          <Skeleton className="mt-4 h-4 w-56" />
        </PublicContainer>
      </SkeletonRegion>
      <PublicContainer className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:py-14">
        <div aria-hidden="true" className="rounded-xl border border-border bg-surface p-6 lg:col-start-2 lg:row-start-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-12 w-full" />
          <SkeletonText lines={4} className="mt-6" />
        </div>
        <div aria-hidden="true" className="lg:col-start-1 lg:row-start-1">
          <Skeleton className="h-6 w-52" />
          <SkeletonText lines={5} className="mt-4" />
        </div>
      </PublicContainer>
    </div>
  )
}
