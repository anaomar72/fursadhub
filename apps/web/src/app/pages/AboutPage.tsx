import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '../../components/ui'
import * as publicOpportunityApi from '../../features/opportunities/api/publicOpportunityApi'
import * as organizationApi from '../../features/organization/api/organizationApi'
import * as universityApi from '../../features/university/api/universityApi'
import { PresentationBand, SkylineArtwork } from '../../components/ui/Presentation'

const JOURNEY = [
  { key: 'sourcing', icon: 'briefcase' },
  { key: 'candidacy', icon: 'users' },
  { key: 'offer', icon: 'badgeCheck' },
  { key: 'supervision', icon: 'clipboard' },
  { key: 'completion', icon: 'graduationCap' },
] as const satisfies readonly { key: string; icon: IconName }[]

const AUDIENCES = [
  { key: 'students', icon: 'graduationCap', to: '/register?role=student' },
  { key: 'organizations', icon: 'building', to: '/register?role=organization' },
  { key: 'universities', icon: 'bank', to: '/register?role=university' },
] as const satisfies readonly { key: string; icon: IconName; to: string }[]

const TRUST = ['biometrics', 'evidence', 'testimonials', 'pilot'] as const

/**
 * The public About page, in the approved presentation language of reference 01 (navy identity bands,
 * orange for the single primary action, the shared skyline art, the 1448px content column).
 *
 * <p>Every claim here describes something the product actually does. The counters are the real
 * `totalElements` of the three public directories and show an em dash rather than a zero while they
 * are unresolved; the workflow section is the pipeline CLAUDE.md section 2 defines; and the "what we
 * do not do" section states the V1 boundaries plainly. There are no invented customers, team
 * biographies, funding claims, awards or growth statistics, because nothing in the product supplies
 * them.
 */
export function AboutPage() {
  const { t } = useTranslation()

  const internships = useQuery({
    queryKey: ['public-opportunities', 'about-count'],
    queryFn: () => publicOpportunityApi.listPublicOpportunities({ page: 0, size: 1 }),
  })
  const organizations = useQuery({
    queryKey: ['public-organizations', 'about-count'],
    queryFn: () => organizationApi.listPublicOrganizations({ page: 0, size: 1 }),
  })
  const universities = useQuery({
    queryKey: ['public-universities', 'about-count'],
    queryFn: () => universityApi.listPublicUniversities({ page: 0, size: 1 }),
  })

  const counts = [
    { key: 'internships', value: internships.data?.totalElements },
    { key: 'organizations', value: organizations.data?.totalElements },
    { key: 'universities', value: universities.data?.totalElements },
  ] as const

  return (
    <div className="overflow-x-clip bg-background">
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        {/*
          The skyline asset is dark navy line art on transparency. Placed on this navy band it has
          to be inverted to a white silhouette before it is visible at all — at `opacity-20` with no
          filter it was dark-on-dark and read as a ghost. This is the same treatment the approved
          footer uses (`brightness-0 invert opacity-40`), so the two navy surfaces carry the
          artwork with the same confidence. Text above it stays white-on-navy and is unaffected:
          the art is a bottom-anchored silhouette, not a full-bleed wash.
        */}
        <SkylineArtwork className="absolute inset-x-0 bottom-0 w-full opacity-40" />
        <div className="relative mx-auto max-w-[1448px] px-4 py-16 sm:px-6 lg:px-[54px]">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-accent">
            {t('common:publicPages.about.eyebrow')}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t('common:publicPages.about.titleStart')}{' '}
            <span className="text-brand-accent">{t('common:publicPages.about.titleAccent')}</span>{' '}
            {t('common:publicPages.about.titleEnd')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
            {t('common:publicPages.about.intro')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex h-11 items-center rounded-lg bg-brand-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:publicPages.about.join')}
            </Link>
            <Link
              to="/opportunities"
              className="inline-flex h-11 items-center rounded-lg border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:publicPages.about.browse')}
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ live counts */}
      <section aria-labelledby="about-counts" className="mx-auto max-w-[1448px] px-4 py-12 sm:px-6 lg:px-[54px]">
        <h2 id="about-counts" className="font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
          {t('common:publicPages.about.countsTitle')}
        </h2>
        <p className="mt-1.5 text-sm text-foreground-secondary">{t('common:publicPages.about.countsHint')}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {counts.map((count) => (
            <div key={count.key} className="rounded-xl border border-border bg-surface p-6 shadow-xs">
              {/* An unresolved or failed request shows an em dash. A zero would be a claim. */}
              <dd className="font-display text-4xl font-extrabold text-brand-navy dark:text-foreground">
                {count.value ?? '—'}
              </dd>
              <dt className="mt-2 text-sm font-medium text-foreground-secondary">
                {t(`common:publicPages.about.counts.${count.key}`)}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------ mission and vision */}
      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto grid max-w-[1448px] gap-5 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-[54px]">
          {(['mission', 'vision'] as const).map((item, index) => (
            <div key={item} className="rounded-xl border border-border bg-surface p-7 shadow-xs">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                <Icon name={index ? 'eye' : 'globe'} className="size-6" />
              </span>
              <h2 className="mt-5 font-display text-xl font-extrabold text-brand-navy dark:text-foreground">
                {t(`common:publicPages.about.${item}.title`)}
              </h2>
              <p className="mt-3 text-sm leading-7 text-foreground-secondary">
                {t(`common:publicPages.about.${item}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ the real workflow */}
      <section aria-labelledby="about-journey" className="mx-auto max-w-[1448px] px-4 py-14 sm:px-6 lg:px-[54px]">
        <h2 id="about-journey" className="font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
          {t('common:publicPages.about.journeyTitle')}
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm text-foreground-secondary">
          {t('common:publicPages.about.journeyHint')}
        </p>
        <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {JOURNEY.map((step, index) => (
            <li key={step.key} className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white">
                  <Icon name={step.icon} className="size-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-accent-ink">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-brand-navy dark:text-foreground">
                {t(`common:publicPages.about.journey.${step.key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-foreground-secondary">
                {t(`common:publicPages.about.journey.${step.key}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ audiences */}
      <section aria-labelledby="about-audience" className="border-y border-border bg-surface-muted">
        <div className="mx-auto max-w-[1448px] px-4 py-14 sm:px-6 lg:px-[54px]">
          <h2 id="about-audience" className="font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
            {t('common:publicPages.about.audienceTitle')}
          </h2>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {AUDIENCES.map((audience) => (
              <div key={audience.key} className="flex flex-col rounded-xl border border-border bg-surface p-7 shadow-xs">
                <span className="flex size-12 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                  <Icon name={audience.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-extrabold text-brand-navy dark:text-foreground">
                  {t(`common:publicPages.about.audience.${audience.key}.title`)}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-foreground-secondary">
                  {t(`common:publicPages.about.audience.${audience.key}.body`)}
                </p>
                <Link
                  to={audience.to}
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-link transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                >
                  {t('common:publicPages.about.join')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ boundaries */}
      <section aria-labelledby="about-trust" className="mx-auto max-w-[1448px] px-4 py-14 sm:px-6 lg:px-[54px]">
        <h2 id="about-trust" className="font-display text-2xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">
          {t('common:publicPages.about.trustTitle')}
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm text-foreground-secondary">
          {t('common:publicPages.about.trustHint')}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {TRUST.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-5 shadow-xs">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
                <Icon name="shield" className="size-4" />
              </span>
              <span className="text-sm leading-6 text-foreground-secondary">
                {t(`common:publicPages.about.trust.${item}`)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ closing call to action */}
      <section className="mx-auto max-w-[1448px] px-4 pb-14 sm:px-6 lg:px-[54px]">
        <PresentationBand
          title={t('common:publicPages.about.ctaTitle')}
          body={t('common:publicPages.about.ctaBody')}
        >
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex h-10 items-center rounded-lg bg-brand-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:publicPages.about.join')}
            </Link>
            <Link
              to="/opportunities"
              className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-navy transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {t('common:publicPages.about.browse')}
            </Link>
          </div>
        </PresentationBand>
      </section>
    </div>
  )
}
