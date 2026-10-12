import { PublicProfileHeader, PublicProfileSkeleton } from '../../../components/ui/PublicProfileHeader'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import {
  ButtonLink,
  buttonClasses,
  EmptyState,
  Icon,
  Reveal,
  Skeleton,
  SkeletonRegion,
  VerifiedBadge,
  type IconName,
} from '../../../components/ui'
import { PublicContainer } from '../../../app/layouts/PublicContainer'

/**
 * A university's public profile — no account required, and the exact counterpart of the
 * organization profile: an identity band (cover banner, crest overlapping it, name with the compact
 * blue check), then the long-form About beside a facts column. On a phone the facts come first.
 * Every field comes from the public university payload.
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
      <SkeletonRegion className="border-b border-border bg-background">
        <PublicContainer className="pb-10 pt-8">
          <Skeleton className="h-4 w-40" />
          <PublicProfileSkeleton />
        </PublicContainer>
      </SkeletonRegion>
    )
  }

  if (universityQuery.isError || !universityQuery.data) {
    return (
      <PublicContainer className="py-16 lg:py-24">
        <EmptyState
          icon="bank"
          title={t('university:publicProfile.notFound')}
          action={
            <ButtonLink to="/universities" variant="outline">
              {t('university:publicProfile.back')}
            </ButtonLink>
          }
        />
      </PublicContainer>
    )
  }

  const university = universityQuery.data
  const facts: { key: string; icon: IconName; label: string; value: ReactNode }[] = [
    ...(university.city ? [{ key: 'city', icon: 'mapPin' as const, label: t('university:publicProfile.location'), value: university.city }] : []),
    ...(university.website
      ? [
          {
            key: 'website',
            icon: 'globe' as const,
            label: t('university:publicProfile.website'),
            value: (
              <a href={university.website} target="_blank" rel="noreferrer" className="break-all text-link underline-offset-4 hover:underline">
                {university.website}
              </a>
            ),
          },
        ]
      : []),
    ...(university.publicContactEmail
      ? [{ key: 'contact', icon: 'document' as const, label: t('university:publicProfile.contact'), value: university.publicContactEmail }]
      : []),
  ]

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-surface">
        <PublicContainer className="pb-8 pt-8 lg:pb-12">
          <Link
            to="/universities"
            className="inline-flex items-center gap-1.5 rounded-sm text-label text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            <Icon name="chevronLeft" className="size-4 rtl:rotate-180" />
            {t('university:publicProfile.back')}
          </Link>

          <PublicProfileHeader name={university.name} verified={university.verified} coverUrl={university.hasCover ? universityApi.universityCoverUrl(university.id) : undefined} logoUrl={university.hasLogo ? universityApi.universityLogoUrl(university.id) : undefined} subtitle={university.city ?? undefined}  actions={university.website ? <a href={university.website} target="_blank" rel="noreferrer" className={buttonClasses('outline','md')}>{t('university:publicProfile.visitWebsite')}<Icon name="arrowRight" className="size-4 -rotate-45"/></a> : undefined} />

        </PublicContainer>
      </section>

      <PublicContainer className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 lg:py-14">
        {(facts.length > 0 || university.verified) && (
          <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-start">
            <div className="rounded-xl border border-border bg-surface p-6">
              {facts.length > 0 && (
                <>
                  <h2 className="font-display text-title-panel text-foreground">{t('university:publicProfile.quickFacts')}</h2>
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
                </>
              )}
              {university.verified && (
                <div className={facts.length > 0 ? 'mt-6 flex items-start gap-3 border-t border-border pt-5' : 'flex items-start gap-3'}>
                  <VerifiedBadge size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-label text-foreground">{t('university:publicProfile.verifiedTitle')}</p>
                    <p className="mt-0.5 text-caption text-foreground-secondary">{t('university:publicProfile.verifiedBody')}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Reveal as="section" aria-labelledby="about-heading">
            <h2 id="about-heading" className="font-display text-title-section text-foreground">
              {t('university:publicProfile.about', { name: university.name })}
            </h2>
            <p className="mt-3 max-w-prose whitespace-pre-line break-words text-body-lg text-foreground-secondary">
              {university.description || t('common:remediation.notProvided')}
            </p>
          </Reveal>
        </div>
      </PublicContainer>
    </div>
  )
}
