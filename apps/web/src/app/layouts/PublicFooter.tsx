import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from '../../components/ui'

/**
 * The approved public footer (design-reference/presentation-refresh-2026, references 01-06): a
 * navy band carrying the FursadHub lockup and description, three columns of destinations, and a
 * closing rule with the copyright and strapline over a faint skyline.
 *
 * <p>Two blocks the references show are deliberately NOT built, because nothing behind them exists:
 * <ul>
 *   <li>the "Stay updated" newsletter subscribe form — there is no subscription endpoint, and a
 *       field that silently discards an email address is worse than no field;</li>
 *   <li>the "Support" column (Help Center, Contact Us, FAQs, Feedback) and the "Resources"
 *       destination — none of these are routes in this application.</li>
 * </ul>
 * Both follow the reference README: never fabricate, and never change the backend to match a
 * mockup. Every link below points at a route that actually exists.
 */
export function PublicFooter() {
  const { t } = useTranslation()

  return (
    <footer className="surface-dark relative overflow-hidden border-t border-border bg-surface text-foreground">
      <SkylineBackdrop />
      <div className="relative mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <BrandLogo surface="dark" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-foreground-secondary">
              {t('common:footer.description')}
            </p>
          </div>

          <FooterNav
            heading={t('common:footer.platformNav')}
            links={[
              { to: '/opportunities', label: t('common:nav.internships') },
              { to: '/organizations', label: t('common:nav.organizations') },
              { to: '/universities', label: t('common:nav.universities') },
              { to: '/about', label: t('common:nav.about') },
            ]}
          />

          <FooterNav
            heading={t('common:footer.accountNav')}
            links={[
              { to: '/login', label: t('common:nav.login') },
              { to: '/register', label: t('common:nav.getStarted') },
            ]}
          />

          <FooterNav
            heading={t('common:footer.legalNav')}
            links={[
              { to: '/legal/terms', label: t('legal:documentTypes.TERMS') },
              { to: '/legal/privacy-policy', label: t('legal:documentTypes.PRIVACY_POLICY') },
              { to: '/legal/cookie-policy', label: t('legal:documentTypes.COOKIE_POLICY') },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-foreground-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>{t('common:footer.copyright', { year: new Date().getFullYear() })}</p>
          <p>{t('common:footer.strapline')}</p>
        </div>
      </div>
    </footer>
  )
}

function FooterNav({ heading, links }: { heading: string; links: { to: string; label: string }[] }) {
  return (
    <nav aria-label={heading}>
      <h2 className="font-display text-sm font-bold text-foreground">{heading}</h2>
      <ul className="mt-4 space-y-3 text-sm text-foreground-secondary">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
              to={link.to}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The faint skyline the approved footer sits over. Purely decorative line-work — it carries no
 * information and is hidden from assistive technology.
 */
function SkylineBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 480 120"
      preserveAspectRatio="xMaxYMax slice"
      className="pointer-events-none absolute bottom-0 end-0 h-32 w-[min(46rem,70%)] text-white/[0.07]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 120V74h26v46M34 86h22v34M56 62h18v58M74 96h20v24M94 44h30v76M124 80h24v40M148 58h20v62M168 92h26v28M194 34h28v86M222 72h22v48M244 52h26v68M270 88h20v32M290 40h30v80M320 76h22v44M342 60h20v60M362 94h26v26M388 30h30v90M418 70h24v50M442 86h30v34" />
      <path d="M100 44V30M109 30h6M206 34V18M215 18h6M300 40V26M309 26h6M398 30V14M407 14h6" />
    </svg>
  )
}
