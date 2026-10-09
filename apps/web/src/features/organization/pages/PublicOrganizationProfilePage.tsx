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
  ButtonLink,
  buttonClasses,
  CARD_GRID,
  EmptyState,
  Icon,
  ProfileBanner,
  Reveal,
  Skeleton,
  SkeletonCardGrid,
  SkeletonRegion,
  VerifiedBadge,
  type IconName,
} from '../../../components/ui'
import { PublicContainer } from '../../../app/layouts/PublicContainer'
import { PublicOpportunityCard } from '../../opportunities/components/PublicOpportunityCard'
import { PublicBookmarks } from '../../student/components/PublicBookmarks'

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

  if (organizationQuery.isLoading) return <ProfileSkeleton />

  if (organizationQuery.isError || !organizationQuery.data) {
    return (
      <PublicContainer className="py-16 lg:py-24">
        <EmptyState
          icon="building"
          title={t('organization:publicProfile.notFound')}
          action={
            <ButtonLink to="/organizations" variant="outline">
              {t('organization:publicProfile.back')}
            </ButtonLink>
          }
        />
      </PublicContainer>
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
    ...(organization.city ? [{ key: 'hq', icon: 'mapPin' as const, label: t('organization:publicProfile.headquarters'), value: organization.city }] : []),
    ...(organization.website
      ? [
          {
            key: 'website',
            icon: 'globe' as const,
            label: t('organization:publicProfile.website'),
            value: (
              <a href={organization.website} target="_blank" rel="noreferrer" className="break-all text-link underline-offset-4 hover:underline">
                {organization.website}
              </a>
            ),
          },
        ]
      : []),
    ...(typeof opportunitiesQuery.data?.totalElements === 'number'
      ? [{ key: 'openings', icon: 'briefcase' as const, label: t('organization:publicProfile.openOpportunities'), value: opportunitiesQuery.data.totalElements.toLocaleString() }]
      : []),
  ]

  return (
    <PublicBookmarks ids={opportunities.map((item) => item.id)}>
    <div className="bg-background">
      {/* ------------------------------------------------------------------ identity band */}
      <section className="border-b border-border bg-surface">
        <PublicContainer className="pb-8 pt-8 lg:pb-12">
          <Link
            to="/organizations"
            className="inline-flex items-center gap-1.5 rounded-sm text-label text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            <Icon name="chevronLeft" className="size-4 rtl:rotate-180" />
            {t('organization:publicProfile.back')}
          </Link>

          <ProfileBanner
            coverUrl={organization.hasCover ? organizationApi.organizationCoverUrl(organization.id) : undefined}
            className="mt-5"
          />

          <div className="relative -mt-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-2 sm:px-6">
            <div className="flex min-w-0 flex-1 basis-[18rem] items-end gap-4">
              <Avatar
                src={organization.hasLogo ? organizationApi.organizationLogoUrl(organization.id) : null}
                name={organization.name}
                size="lg"
                shape="square"
                className="size-24 shrink-0 border-4 border-surface shadow-sm sm:size-32"
              />
              <div className="min-w-0 pb-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="break-words font-display text-title-page text-foreground">{organization.name}</h1>
                  {organization.verified && <VerifiedBadge />}
                </div>
                <p className="mt-1 break-words text-body text-foreground-secondary">
                  {[organization.industry || t(`organization:profile.types.${organization.type}`), organization.city].filter(Boolean).join(' • ')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink to={`/opportunities?organization=${organization.id}`}>{t('organization:publicProfile.viewOpportunities')}</ButtonLink>
              {organization.website && (
                <a href={organization.website} target="_blank" rel="noreferrer" className={buttonClasses('outline', 'md')}>
                  {t('organization:publicProfile.visitWebsite')}
                  <Icon name="arrowRight" className="size-4 -rotate-45 rtl:rotate-[225deg]" />
                </a>
              )}
              <ShareLink />
            </div>
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 px-2 sm:px-6">
              {socialLinks.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(`common:social.${platform}`)}
                  title={t(`common:social.${platform}`)}
                  className="inline-flex size-10 items-center justify-center rounded-md border border-border text-foreground-secondary transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                >
                  <SocialIcon platform={platform as SocialPlatform} />
                </a>
              ))}
            </div>
          )}
        </PublicContainer>
      </section>

      {/* ------------------------------------------------------------------ body */}
      <PublicContainer className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 lg:py-14">
        <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-start">
          {facts.length > 0 && (
            <div id="facts" className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-title-panel text-foreground">{t('organization:publicProfile.quickFacts')}</h2>
              <dl className="mt-4 grid gap-4">
                {facts.map((fact) => (
                  <div key={fact.key} className="flex items-start gap-3">
                    <Icon name={fact.icon} className="mt-0.5 size-4 shrink-0 text-muted" />
                    <div className="min-w-0">
                      <dt className="text-caption text-foreground-secondary">{fact.label}</dt>
                      <dd className="mt-0.5 break-words text-body font-semibold text-foreground">{fact.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              {organization.verified && (
                <div className="mt-6 flex items-start gap-3 border-t border-border pt-5">
                  <VerifiedBadge size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-label text-foreground">{t('organization:publicProfile.verifiedTitle')}</p>
                    <p className="mt-0.5 text-caption text-foreground-secondary">{t('organization:publicProfile.verifiedBody')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Reveal as="section" id="about" aria-labelledby="about-heading" className="scroll-mt-24">
            <h2 id="about-heading" className="font-display text-title-section text-foreground">
              {t('organization:publicProfile.about', { name: organization.name })}
            </h2>
            <p className="mt-3 max-w-prose whitespace-pre-line break-words text-body-lg text-foreground-secondary">
              {organization.description ?? organization.shortDescription ?? t('common:remediation.notProvided')}
            </p>
          </Reveal>

          {/* The organization's own published internships, from the public feed scoped to it. With
              none, a quiet line says so rather than padding the page. */}
          <section id="openings" aria-labelledby="openings-heading" className="mt-12 scroll-mt-24 border-t border-border pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="openings-heading" className="font-display text-title-section text-foreground">
                {t('organization:publicProfile.latestOpportunities')}
              </h2>
              {opportunities.length > 0 && (
                <Link
                  to={`/opportunities?organization=${organization.id}`}
                  className="inline-flex items-center gap-1.5 rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {t('organization:publicProfile.viewAllOpportunities')}
                  <Icon name="arrowRight" className="size-4 rtl:rotate-180" />
                </Link>
              )}
            </div>
            {opportunitiesQuery.isLoading ? (
              <SkeletonCardGrid count={2} className="mt-5" />
            ) : opportunities.length > 0 ? (
              <ul className={`mt-5 ${CARD_GRID}`}>
                {opportunities.map((opportunity, index) => (
                  <Reveal as="li" key={opportunity.id} index={index} className="min-w-0">
                    <PublicOpportunityCard opportunity={opportunity} density="compact" />
                  </Reveal>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-body text-foreground-secondary">{t('organization:publicProfile.noOpportunities')}</p>
            )}
          </section>
        </div>
      </PublicContainer>
    </div>
    </PublicBookmarks>
  )
}

/** The profile's shape while it loads: back link, banner, identity row. */
function ProfileSkeleton() {
  return (
    <SkeletonRegion className="border-b border-border bg-surface">
      <PublicContainer className="pb-10 pt-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-5 aspect-[4/1] w-full rounded-xl" />
        <div className="-mt-10 flex items-end gap-4 px-2 sm:px-6">
          <Skeleton className="size-24 rounded-xl border-4 border-surface sm:size-32" />
          <div className="flex-1 pb-1">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
        </div>
      </PublicContainer>
    </SkeletonRegion>
  )
}
