import { ExplanatoryArtwork, MarketplaceRail, PresentationBand, SectionNavigation } from '../../../components/ui/Presentation'
import { ShareLink } from '../../../components/ui/ShareLink'
import { SocialIcon, type SocialPlatform } from '../../../components/ui/SocialIcon'
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
  Reveal,
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
 * Uploaded media, public profile fields, founding year, size and opening totals come from the API.
 * Unsupported culture videos and customer claims use generic platform guidance instead.
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
        <LoadingSpinner size="lg" label={t('common:status.loading')} />
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
  const socialLinks = (
    [
      ['linkedin', organization.linkedinUrl],
      ['x', organization.xUrl],
      ['instagram', organization.instagramUrl],
      ['youtube', organization.youtubeUrl],
    ] as const
  ).filter(([, url]) => url)
  const facts: { key: string; icon: IconName; label: string; value: ReactNode }[] = [
    ...(organization.companySizeRange ? [{ key: 'size', icon: 'users' as const, label: t('organization:profile.companySizeLabel'), value: t(`organization:profile.companySizeValues.${organization.companySizeRange}`) }] : []),
    ...(organization.foundedYear ? [{ key: 'founded', icon: 'clock' as const, label: t('organization:profile.foundedYearLabel'), value: organization.foundedYear }] : []),
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
    <div className="mx-auto w-full max-w-[1448px] px-4 py-8 sm:px-6 lg:px-14">
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
            className="size-28 shrink-0 border-4 border-surface shadow-sm sm:size-36"
          />
          <div className="min-w-0 pt-12">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-extrabold tracking-[-0.03em] text-brand-navy dark:text-foreground sm:text-3xl">
                {organization.name}
              </h1>
              {organization.verified && <VerifiedBadge />}
            </div>
            <p className="mt-1 truncate text-sm text-foreground-secondary">
              {[organization.industry || t(`organization:profile.types.${organization.type}`), organization.city].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-12">
          <Link
            to={`/opportunities?organization=${organization.id}`}
            className="inline-flex h-10 items-center rounded-lg bg-action-primary px-5 text-sm font-semibold text-on-action shadow-xs transition-colors hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
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
          {/* Share belongs beside the other actions. It used to sit in the social-icon row below,
              which meant an organization with no social links rendered that row containing a single
              stranded icon button floating in whitespace under the identity block. */}
          <ShareLink />
        </div>
      </div>

      {/* Only when there is actually something to link to. */}
      {socialLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 px-4 text-xs font-semibold text-link">
          {socialLinks.map(([platform, url]) => (
            <a
              key={platform}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(`common:social.${platform}`)}
              title={t(`common:social.${platform}`)}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <SocialIcon platform={platform as SocialPlatform} />
            </a>
          ))}
        </div>
      )}
      <SectionNavigation items={[{ id: 'about', label: t('common:remediation.about') }, { id: 'openings', label: t('organization:publicProfile.latestOpportunities') }, { id: 'facts', label: t('organization:publicProfile.quickFacts') }]} />
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div>
          <Reveal><Card padding="lg" id="about" className="scroll-mt-24">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
              {t('organization:publicProfile.about', { name: organization.name })}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground-secondary">
              {organization.description ?? organization.shortDescription ?? t('common:remediation.notProvided')}
            </p>
            <div className="mt-5 flex items-center gap-5 rounded-lg bg-background p-4"><ExplanatoryArtwork kind="learning" className="w-28 shrink-0" /><div><h3 className="text-sm font-bold">{t('common:remediation.opportunityTitle')}</h3><p className="mt-2 text-xs leading-5 text-foreground-secondary">{t('common:remediation.opportunityBody')}</p></div></div>
          </Card></Reveal>

          {facts.length > 0 && (
            <Reveal index={1}><Card padding="lg" id="facts" className="mt-5 scroll-mt-24">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
                {t('organization:publicProfile.quickFacts')}
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            </Card></Reveal>
          )}
          {/* Reference 05 closes the main column with the organization's own latest openings.
            These are real rows from the public feed scoped to this organization — when it has
            none, the section says so rather than padding the page out. */}
          <Reveal as="section" index={2} id="openings" className="mt-5 scroll-mt-24">
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
          </Reveal>
        </div>

        <aside className="grid gap-4">
          <MarketplaceRail />


          {organization.verified && (
            <Card padding="lg" className="border-brand-blue/20 bg-brand-blue-soft/40">
              <div className="flex items-start gap-3">
                <VerifiedBadge variant="information" className="mt-0.5" />
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
      <div className="mt-6"><PresentationBand title={t('common:remediation.bandTitle')} body={t('common:remediation.bandBody')}><Link to="/opportunities" className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-bold">{t('common:remediation.browse')}</Link></PresentationBand></div>
    </div>
  )
}
