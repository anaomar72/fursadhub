import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { BrandLogo, Icon } from '../../../components/ui'
import heroPhoto from '../../../assets/presentation/hero-woman.webp'
import heroPhotoSmall from '../../../assets/presentation/hero-woman-800.webp'
import { panelKeyForPath } from '../authPanels'

/**
 * The branded half of the authentication experience.
 *
 * A navy editorial panel separates route-specific copy from the approved student photograph.
 * This is static presentation content; authentication and form behavior remain in their routes.
 */

const TRUST_POINTS = ['verified', 'private', 'bilingual'] as const

export function AuthBrandPanel() {
  const { t } = useTranslation()
  const panel = panelKeyForPath(useLocation().pathname)

  // Sticky and exactly one viewport tall: the register form is taller than the screen, and a panel
  // that scrolls away with it leaves the visitor staring at a bare white column. Held in place, the
  // brand frames the whole form instead of only its first screenful.
  return (
    <aside className="surface-dark relative hidden bg-surface text-foreground lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
      <div className="flex h-full flex-col gap-8 overflow-y-auto p-8 xl:p-12">
        <BrandLogo surface="dark" size="lg" withTagline/>
        <div className="my-auto max-w-md py-8">
          <p className="text-label text-brand-accent-ink">{t(`common:authPresentation.panels.${panel}.eyebrow`)}</p>
          <h2 className="mt-4 font-display text-display-lg text-foreground">{t(`common:authPresentation.panels.${panel}.title`)}</h2>
          <p className="mt-4 text-body-lg text-foreground-secondary">{t(`common:authPresentation.panels.${panel}.body`)}</p>
          <ul className="mt-8 space-y-4 border-t border-border pt-6">{TRUST_POINTS.map(point=><li key={point} className="flex items-start gap-3 text-body text-foreground-secondary"><Icon name="check" className="mt-1 size-4 shrink-0 text-brand-accent-ink"/>{t(`common:authPresentation.trust.${point}`)}</li>)}</ul>
        </div>
        <img src={heroPhoto} srcSet={`${heroPhotoSmall} 800w, ${heroPhoto} 1440w`} sizes="40vw" alt="" decoding="async" width={1440} height={810} className="aspect-[2/1] w-full shrink-0 rounded-xl object-cover object-center"/>
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
