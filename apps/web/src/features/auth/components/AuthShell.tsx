import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { BrandLogo, Icon } from '../../../components/ui'
import heroPhoto from '../../../assets/presentation/hero-woman.webp'
import heroPhotoSmall from '../../../assets/presentation/hero-woman-800.webp'
import { panelKeyForPath } from '../authPanels'

/**
 * The branded half of the authentication experience.
 *
 * Composition, per the approved presentation language: the approved student photograph fills the
 * panel, a navy scrim carries it down to brand colour so white type sits on FursadHub navy rather
 * than on unpredictable photo pixels, and orange marks the accents. Nothing here is a data
 * surface — no tenant, person, metric or record is rendered, only static presentation copy — so
 * it needs no query and cannot fabricate anything.
 */

const TRUST_POINTS = ['verified', 'private', 'bilingual'] as const

export function AuthBrandPanel() {
  const { t } = useTranslation()
  const panel = panelKeyForPath(useLocation().pathname)

  // Sticky and exactly one viewport tall: the register form is taller than the screen, and a panel
  // that scrolls away with it leaves the visitor staring at a bare white column. Held in place, the
  // brand frames the whole form instead of only its first screenful.
  return (
    <aside className="relative hidden overflow-hidden bg-brand-navy lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
      {/*
        Decorative: `alt=""` keeps the photograph out of the accessibility tree. It is approved
        presentation art, never a FursadHub user.
      */}
      <img src={heroPhoto} srcSet={`${heroPhotoSmall} 800w, ${heroPhoto} 1440w`} sizes="50vw" alt="" decoding="async" width={1440} height={810} className="absolute inset-0 size-full object-cover object-center" />
      {/*
        Two overlays, because one cannot do both jobs. The flat veil guarantees a floor of contrast
        everywhere — the lockup at the top must stay legible even where the photograph is bright
        sky, and a bottom-up gradient alone leaves that to chance as the viewport height changes.
        The gradient then takes the lower half to solid navy, where the headline and trust list sit.
        Roughly half the photograph still reads through, so this is a scrim, not the wash that made
        the About illustration disappear.
      */}
      <div className="absolute inset-0 bg-brand-navy/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/70 to-transparent" />

      {/*
        `gap` + `overflow-y-auto` rather than `justify-between` alone: on a short desktop window the
        lockup and the eyebrow were colliding, because space-between happily distributes negative
        space. The gap sets a floor on the separation and the scroll absorbs whatever is left.
      */}
      <div className="relative flex size-full flex-col justify-between gap-10 overflow-y-auto p-10 xl:p-14">
        <BrandLogo surface="dark" size="lg" withTagline />

        <div className="max-w-md">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-accent">
            {t(`common:authPresentation.panels.${panel}.eyebrow`)}
          </p>
          <h2 className="mt-4 font-display text-display-lg text-white">
            {t(`common:authPresentation.panels.${panel}.title`)}
          </h2>
          <p className="mt-4 text-body-lg text-white/85">
            {t(`common:authPresentation.panels.${panel}.body`)}
          </p>

          <ul className="mt-8 space-y-3 border-t border-white/15 pt-6">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-body text-white/85">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
                  <Icon name="check" className="size-3.5" />
                </span>
                {t(`common:authPresentation.trust.${point}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

/** "Back to Home" — present on every auth screen, per the brief. */
export function BackToHomeLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 rounded-sm text-label text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
    >
      <Icon name="chevronLeft" className="size-4 rtl:rotate-180" />
      {t('common:authPresentation.backHome')}
    </Link>
  )
}

/** Legal + help links, closing the form column. */
export function AuthFooterLinks() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-foreground-secondary">
      <Link to="/legal/terms" className="rounded-sm py-1 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        {t('legal:documentTypes.TERMS')}
      </Link>
      <Link to="/legal/privacy-policy" className="rounded-sm py-1 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        {t('legal:documentTypes.PRIVACY_POLICY')}
      </Link>
      <Link to="/about" className="rounded-sm py-1 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        {t('common:nav.about')}
      </Link>
    </div>
  )
}
