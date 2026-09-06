import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { Avatar, Card, Icon, LoadingSpinner, ProfileBanner, VerifiedBadge, type IconName } from '../../../components/ui'

/**
 * A university's public profile — no account required, and the exact counterpart of the
 * organization profile.
 *
 * <p>Follows the approved profile composition (design-reference/presentation-refresh-2026,
 * reference 05, extrapolated to universities since the set has no dedicated university-detail
 * mockup): cover banner with the crest overlapping it, identity row with the compact blue check,
 * then long-form "About" beside quick facts and the verification note.
 */
export function PublicUniversityProfilePage() {
  const { t } = useTranslation()
  const { universityId } = useParams<{ universityId: string }>()

  const universityQuery = useQuery({
    queryKey: ['public-university', universityId],
    queryFn: () => universityApi.getPublicUniversity(universityId!),
    enabled: !!universityId,
    retry: false,
  })

  if (universityQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (universityQuery.isError || !universityQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-foreground-secondary">{t('university:publicProfile.notFound')}</p>
      </div>
    )
  }

  const university = universityQuery.data
  const facts: { key: string; icon: IconName; label: string; value: ReactNode }[] = [
    ...(university.city
      ? [{ key: 'city', icon: 'globe' as const, label: t('university:publicProfile.location'), value: university.city }]
      : []),
    ...(university.website
      ? [
          {
            key: 'website',
            icon: 'globe' as const,
            label: t('university:publicProfile.website'),
            value: (
              <a href={university.website} target="_blank" rel="noreferrer" className="text-link hover:underline">
                {university.website}
              </a>
            ),
          },
        ]
      : []),
    ...(university.publicContactEmail
      ? [
          {
            key: 'contact',
            icon: 'document' as const,
            label: t('university:publicProfile.contact'),
            value: university.publicContactEmail,
          },
        ]
      : []),
  ]

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-14">
      <Link
        to="/universities"
        className="inline-flex items-center gap-2 rounded text-sm font-semibold text-link transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
      >
        <Icon name="chevronLeft" className="size-4" />
        {t('university:publicProfile.back')}
      </Link>

      <ProfileBanner
        coverUrl={university.hasCover ? universityApi.universityCoverUrl(university.id) : undefined}
        className="mt-5"
      />

      <div className="relative -mt-10 flex flex-wrap items-start justify-between gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar
            src={university.hasLogo ? universityApi.universityLogoUrl(university.id) : null}
            name={university.name}
            size="lg"
            shape="square"
            className="size-24 shrink-0 shadow-sm"
          />
          <div className="min-w-0 pt-12">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-extrabold tracking-[-0.03em] text-brand-navy dark:text-foreground sm:text-3xl">
                {university.name}
              </h1>
              {university.verified && <VerifiedBadge />}
            </div>
            {university.city && <p className="mt-1 truncate text-sm text-foreground-secondary">{university.city}</p>}
          </div>
        </div>

        {university.website && (
          <a
            href={university.website}
            target="_blank"
            rel="noreferrer"
            className="mt-12 inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {t('university:publicProfile.visitWebsite')}
            <Icon name="chevronRight" className="size-4" />
          </a>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[2.3fr_1fr] lg:items-start">
        {university.description && (
          <Card padding="lg">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
              {t('university:publicProfile.about', { name: university.name })}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground-secondary">
              {university.description}
            </p>
          </Card>
        )}

        <aside className="grid gap-4">
          {facts.length > 0 && (
            <Card padding="lg">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-brand-navy dark:text-foreground">
                {t('university:publicProfile.quickFacts')}
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

          {university.verified && (
            <Card padding="lg" className="border-success/30 bg-success-bg">
              <div className="flex items-start gap-3">
                <VerifiedBadge className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{t('university:publicProfile.verifiedTitle')}</p>
                  <p className="mt-1 text-sm leading-6 text-foreground-secondary">
                    {t('university:publicProfile.verifiedBody')}
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
