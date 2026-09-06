import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as publicOpportunityApi from '../api/publicOpportunityApi'
import * as organizationApi from '../../organization/api/organizationApi'
import { useAuth } from '../../../lib/auth/AuthContext'
import { Avatar, Badge, Card, Icon, LoadingSpinner, VerifiedBadge, type IconName } from '../../../components/ui'

/**
 * The approved public internship detail page (design-reference/presentation-refresh-2026,
 * reference 03): a back link, the organization identity block above the role title, the fact strip,
 * the long-form content, and a sticky right column carrying the apply panel and the organization
 * summary.
 *
 * <p>The reference's cover image, countdown timer, stipend figure, "similar internships" rail and
 * organization employee/founded statistics are not built — none of those fields or endpoints
 * exist. Following the reference README, they are omitted rather than fabricated.
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
  const organizationQuery = useQuery({
    queryKey: ['public-organization', organizationId],
    queryFn: () => organizationApi.getPublicOrganization(organizationId!),
    enabled: !!organizationId,
    retry: false,
  })

  if (opportunityQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
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
  const organization = organizationQuery.data
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
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-14">
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-2 rounded text-sm font-semibold text-link transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
      >
        <Icon name="chevronLeft" className="size-4" />
        {t('opportunities:public.backToList')}
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[2.2fr_1fr] lg:items-start">
        <article>
          <Card padding="lg">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar
                name={opportunity.organization.name}
                src={
                  organization?.hasLogo ? organizationApi.organizationLogoUrl(opportunity.organization.id) : undefined
                }
                size="lg"
                shape="square"
                className="size-20"
              />
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <Link
                    to={`/organizations/${opportunity.organization.id}`}
                    className="rounded font-display text-base font-extrabold tracking-tight text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring dark:text-foreground"
                  >
                    {opportunity.organization.name}
                  </Link>
                  {opportunity.organization.verified && <VerifiedBadge size="sm" />}
                </div>
                <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] text-brand-navy dark:text-foreground sm:text-4xl">
                  {opportunity.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="brand">{t(`opportunities:workModeValues.${opportunity.workMode}`)}</Badge>
                  {opportunity.location && <Badge>{opportunity.location}</Badge>}
                </div>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
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
          </Card>

          <Card padding="lg" className="mt-4">
            <Section title={t('opportunities:public.aboutInternship')} body={opportunity.description} />
            {opportunity.responsibilities && (
              <Section title={t('opportunities:form.responsibilitiesLabel')} body={opportunity.responsibilities} />
            )}
            {opportunity.requirements && (
              <Section title={t('opportunities:form.requirementsLabel')} body={opportunity.requirements} />
            )}
          </Card>
        </article>

        <aside className="lg:sticky lg:top-24">
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
            {opportunity.organization.verified && (
              <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
                <VerifiedBadge size="sm" className="mt-0.5" />
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
            <Card padding="lg" className="mt-4">
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
    </div>
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
  const { isAuthenticated } = useAuth()

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

function Section({ title, body }: { title: string; body: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
        {title}
      </h2>
      <p className="mt-2.5 whitespace-pre-line text-sm leading-7 text-foreground-secondary">{body}</p>
    </section>
  )
}
