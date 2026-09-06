import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as organizationApi from '../api/organizationApi'
import * as publicOpportunityApi from '../../opportunities/api/publicOpportunityApi'
import {
  Avatar,
  Card,
  Icon,
  InternshipCard,
  LoadingSpinner,
  ProfileBanner,
  VerifiedBadge,
  type IconName,
} from '../../../components/ui'

/**
 * An organization's public profile — no account required. This is the trust surface the
 * verification check exists for: its own name, logo, description and verification status, the way
 * the organization has chosen to present itself.
 *
 * <p>Follows the approved profile composition (design-reference/presentation-refresh-2026,
 * reference 05): cover banner with the logo overlapping it, identity row with the compact blue
 * check and the primary action, then a two-column body — long-form "About" on the left, quick
 * facts and the verification note on the right.
 *
 * <p>The reference's culture video, "why students love us" panel, employee/founded statistics,
 * follower count and email-alert signup are not built: no field or endpoint supplies them.
 */
export function PublicOrganizationProfilePage() {
  const { t } = useTranslation()
  const { organizationId } = useParams<{ organizationId: string }>()

  const organizationQuery = useQuery({
    queryKey: ['public-organization', organizationId],
    queryFn: () => organizationApi.getPublicOrganization(organizationId!),
    enabled: !!organizationId,
    retry: false,
  })

  // The open-opportunity count the approved profile shows. Read from the opportunity feed scoped
  // to this organization, which is the number the directory card shows too.
  const opportunitiesQuery = useQuery({
    queryKey: ['public-opportunities', 'by-organization', organizationId],
    queryFn: () => publicOpportunityApi.listPublicOpportunities({ organization: organizationId, page: 0, size: 4 }),
    enabled: !!organizationId,
    retry: false,
  })

  if (organizationQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (organizationQuery.isError || !organizationQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground-secondary">{t('organization:publicProfile.notFound')}</p>
      </div>
    )
  }

  const organization = organizationQuery.data
  const opportunities = opportunitiesQuery.data?.content ?? []
  const facts: { key: string; icon: IconName; label: string; value: ReactNode }[] = [
    ...(organization.city
      ? [
          {
            key: 'hq',
            icon: 'building' as const,
            label: t('organization:publicProfile.headquarters'),
            value: organization.city,
          },
        ]
      : []),
    ...(organization.website
      ? [
          {
            key: 'website',
            icon: 'globe' as const,
            label: t('organization:publicProfile.website'),
            value: (
              <a href={organization.website} target="_blank" rel="noreferrer" className="text-link hover:underline">
                {organization.website}
              </a>
            ),
          },
        ]
      : []),
    ...(typeof opportunitiesQuery.data?.totalElements === 'number'
      ? [
          {
            key: 'openings',
            icon: 'briefcase' as const,
            label: t('organization:publicProfile.openOpportunities'),
            value: opportunitiesQuery.data.totalElements.toLocaleString(),
          },
        ]
      : []),
  ]

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-14">
      <Link
        to="/organizations"
        className="inline-flex items-center gap-2 rounded text-sm font-semibold text-link transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
      >
        <Icon name="chevronLeft" className="size-4" />
        {t('organization:publicProfile.back')}
      </Link>

      <ProfileBanner
        coverUrl={organization.hasCover ? organizationApi.organizationCoverUrl(organization.id) : undefined}
        className="mt-5"
      />

      <div className="relative -mt-10 flex flex-wrap items-start justify-between gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar
            src={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : null}
            name={organization.name}
            size="lg"
            shape="square"
            className="size-24 shrink-0 shadow-sm"
          />
          <div className="min-w-0 pt-12">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-extrabold tracking-[-0.03em] text-brand-navy dark:text-foreground sm:text-3xl">
                {organization.name}
              </h1>
              {organization.verified && <VerifiedBadge />}
            </div>
            <p className="mt-1 truncate text-sm text-foreground-secondary">
              {[t(`organization:profile.types.${organization.type}`), organization.city].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-12">
          <Link
            to={`/opportunities?organization=${organization.id}`}
            className="inline-flex h-10 items-center rounded-lg bg-brand-accent px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {t('organization:publicProfile.viewOpportunities')}
          </Link>
          {organization.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('organization:publicProfile.visitWebsite')}
              <Icon name="chevronRight" className="size-4" />
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[2.3fr_1fr] lg:items-start">
        <div>
        <Card padding="lg">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
            {t('organization:publicProfile.about', { name: organization.name })}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground-secondary">
            {organization.description ?? organization.shortDescription ?? ''}
          </p>
        </Card>

        {/* Reference 05 closes the main column with the organization's own latest openings.
            These are real rows from the public feed scoped to this organization — when it has
            none, the section says so rather than padding the page out. */}
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
              {t('organization:publicProfile.latestOpportunities')}
            </h2>
            <Link
              to={`/opportunities?organization=${organization.id}`}
              className="inline-flex items-center gap-1.5 rounded text-sm font-bold text-brand-accent-ink transition-colors hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('organization:publicProfile.viewAllOpportunities')}
              <Icon name="chevronRight" className="size-4" />
            </Link>
          </div>
          {opportunities.length > 0 ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {opportunities.map((opportunity) => (
                <li key={opportunity.id} className="relative">
                  <InternshipCard
                    density="compact"
                    title={opportunity.title}
                    organization={organization.name}
                    organizationVerified={organization.verified}
                    location={opportunity.location ?? undefined}
                    workMode={t(`opportunities:workModeValues.${opportunity.workMode}`)}
                  />
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
            <p className="mt-3 rounded-xl border border-border bg-surface px-5 py-4 text-sm text-foreground-secondary">
              {t('organization:publicProfile.noOpportunities')}
            </p>
          )}
        </section>
        </div>

        <aside className="grid gap-4">
          {facts.length > 0 && (
            <Card padding="lg">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
                {t('organization:publicProfile.quickFacts')}
              </h2>
              <dl className="mt-4 grid gap-4">
                {facts.map((fact) => (
                  <div key={fact.key} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
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
          )}

          {organization.verified && (
            <Card padding="lg" className="border-success/30 bg-success-bg">
              <div className="flex items-start gap-3">
                <VerifiedBadge className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{t('organization:publicProfile.verifiedTitle')}</p>
                  <p className="mt-1 text-sm leading-6 text-foreground-secondary">
                    {t('organization:publicProfile.verifiedBody')}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
