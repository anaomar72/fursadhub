import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ButtonLink, Icon, Reveal, type IconName } from '../../components/ui'
import { SkylineArtwork } from '../../components/ui/Presentation'
import { PublicContainer } from '../layouts/PublicContainer'

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

const SECTION_TITLE = 'font-display text-display-lg text-foreground'

/**
 * The public About page: what FursadHub is for, the real workflow, who it serves, and the
 * boundaries it keeps.
 *
 * <p>Every claim describes something the product actually does — the workflow is the pipeline
 * CLAUDE.md section 2 defines, and "what we do not do" states the V1 boundaries plainly. There are no
 * invented customers, team biographies, funding claims or growth statistics. The live directory
 * counts that used to sit under the hero are gone for the same reason they left the home page: the
 * pilot's size is not evidence of anything a visitor needs.
 *
 * <p>Composition is sections on the page, not a stack of bordered cards: the content reads as an
 * article with a rhythm, which is what an explanatory page is.
 */
export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="bg-background">
      {/* ------------------------------------------------------------ hero */}
      <section className="surface-dark relative overflow-hidden bg-surface text-foreground">
        {/* Decorative silhouette, bottom-anchored under the copy — the same treatment as the footer. */}
        <SkylineArtwork className="absolute inset-x-0 bottom-0 h-28 w-full object-cover object-bottom opacity-40 sm:h-36 lg:h-44" />
        <PublicContainer className="relative pb-36 pt-16 sm:pb-44 lg:pb-52 lg:pt-24">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-accent-ink">{t('common:publicPages.about.eyebrow')}</p>
          <h1 className="mt-4 max-w-3xl font-display text-display-xl text-foreground">
            {t('common:publicPages.about.titleStart')}{' '}
            <span className="text-brand-accent-ink">{t('common:publicPages.about.titleAccent')}</span>{' '}
            {t('common:publicPages.about.titleEnd')}
          </h1>
          <p className="mt-5 max-w-2xl text-body-lg text-foreground-secondary">{t('common:publicPages.about.intro')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink to="/register" size="lg">
              {t('common:publicPages.about.join')}
            </ButtonLink>
            <Link
              to="/opportunities"
              className="inline-flex h-12 items-center gap-1.5 rounded-md px-1 text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {t('common:publicPages.about.browse')}
              <Icon name="arrowRight" className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        </PublicContainer>
      </section>

      {/* ------------------------------------------------------------ mission and vision */}
      <section className="py-14 lg:py-20">
        <PublicContainer className="grid gap-12 md:grid-cols-2 md:gap-16">
          {(['mission', 'vision'] as const).map((item, index) => (
            <Reveal key={item} index={index} className="min-w-0">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-navy-soft text-brand-navy dark:text-foreground">
                <Icon name={index ? 'eye' : 'globe'} className="size-5" />
              </span>
              <h2 className="mt-5 font-display text-title-section text-foreground">{t(`common:publicPages.about.${item}.title`)}</h2>
              <p className="mt-3 max-w-prose text-body-lg text-foreground-secondary">{t(`common:publicPages.about.${item}.body`)}</p>
            </Reveal>
          ))}
        </PublicContainer>
      </section>

      {/* ------------------------------------------------------------ the real workflow */}
      <section aria-labelledby="about-journey" className="border-y border-border bg-surface py-14 lg:py-20">
        <PublicContainer>
          <Reveal className="max-w-3xl">
            <h2 id="about-journey" className={SECTION_TITLE}>
              {t('common:publicPages.about.journeyTitle')}
            </h2>
            <p className="mt-3 text-body-lg text-foreground-secondary">{t('common:publicPages.about.journeyHint')}</p>
          </Reveal>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {JOURNEY.map((step, index) => (
              <Reveal as="li" key={step.key} index={index} className="min-w-0 border-t-2 border-border pt-5">
                <div className="flex items-center gap-3">
                  <span className="font-display text-title-section text-brand-accent-ink">{index + 1}</span>
                  <Icon name={step.icon} className="size-5 text-muted" />
                </div>
                <h3 className="mt-3 font-display text-title-panel text-foreground">{t(`common:publicPages.about.journey.${step.key}.title`)}</h3>
                <p className="mt-2 text-body text-foreground-secondary">{t(`common:publicPages.about.journey.${step.key}.body`)}</p>
              </Reveal>
            ))}
          </ol>
        </PublicContainer>
      </section>

      {/* ------------------------------------------------------------ audiences */}
      <section aria-labelledby="about-audience" className="py-14 lg:py-20">
        <PublicContainer>
          <Reveal>
            <h2 id="about-audience" className={SECTION_TITLE}>
              {t('common:publicPages.about.audienceTitle')}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-border rtl:lg:divide-x-reverse">
            {AUDIENCES.map((audience, index) => (
              <Reveal key={audience.key} index={index} className="flex min-w-0 flex-col lg:px-8 lg:first:ps-0 lg:last:pe-0">
                <span className="flex size-11 items-center justify-center rounded-lg bg-brand-accent-soft text-brand-accent-ink">
                  <Icon name={audience.icon} className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-title-section text-foreground">
                  {t(`common:publicPages.about.audience.${audience.key}.title`)}
                </h3>
                <p className="mt-2 flex-1 text-body text-foreground-secondary">{t(`common:publicPages.about.audience.${audience.key}.body`)}</p>
                <Link
                  to={audience.to}
                  className="mt-5 inline-flex items-center gap-1.5 self-start rounded-sm text-body font-semibold text-brand-accent-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {t('common:publicPages.about.join')}
                  <Icon name="arrowRight" className="size-4 rtl:rotate-180" />
                </Link>
              </Reveal>
            ))}
          </div>
        </PublicContainer>
      </section>

      {/* ------------------------------------------------------------ boundaries */}
      <section aria-labelledby="about-trust" className="border-y border-border bg-surface py-14 lg:py-20">
        <PublicContainer className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
          <Reveal className="min-w-0">
            <h2 id="about-trust" className={SECTION_TITLE}>
              {t('common:publicPages.about.trustTitle')}
            </h2>
            <p className="mt-3 text-body-lg text-foreground-secondary">{t('common:publicPages.about.trustHint')}</p>
          </Reveal>
          <ul className="divide-y divide-border border-y border-border">
            {TRUST.map((item) => (
              <li key={item} className="flex items-start gap-3 py-4">
                <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-brand-blue" />
                <span className="min-w-0 text-body-lg text-foreground">{t(`common:publicPages.about.trust.${item}`)}</span>
              </li>
            ))}
          </ul>
        </PublicContainer>
      </section>

      {/* ------------------------------------------------------------ closing call to action */}
      <section aria-labelledby="about-cta" className="py-16 lg:py-24">
        <PublicContainer>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 id="about-cta" className={SECTION_TITLE}>
              {t('common:publicPages.about.ctaTitle')}
            </h2>
            <p className="mt-4 text-body-lg text-foreground-secondary">{t('common:publicPages.about.ctaBody')}</p>
            <div className="mt-8 flex justify-center">
              <ButtonLink to="/register" size="lg" className="w-full sm:w-auto">
                {t('common:publicPages.about.join')}
              </ButtonLink>
            </div>
          </Reveal>
        </PublicContainer>
      </section>
    </div>
  )
}
