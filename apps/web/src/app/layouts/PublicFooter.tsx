import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from '../../components/ui'
import { SkylineArtwork } from '../../components/ui/Presentation'

/**
 * The public footer: the brand and what FursadHub is, then three groups of real destinations —
 * the platform's public directories, help, and the legal documents — and a closing line.
 *
 * <p>Every link resolves to an existing route; nothing here is a placeholder. It sits on the navy
 * band (`surface-dark`), so every token inside it reads the band's own text and border values.
 * Nothing in it is smaller than the 12px caption floor — it used to set every link and the
 * copyright at 11–12px, which is where people look for the legal documents.
 */
export function PublicFooter() {
  const { t } = useTranslation()
  return (
    <footer className="surface-dark relative overflow-hidden bg-surface text-foreground">
      <SkylineArtwork className="absolute bottom-0 end-0 hidden h-40 w-auto opacity-40 lg:block" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo surface="dark" />
            <p className="mt-4 max-w-sm text-body text-foreground-secondary">{t('common:footer.description')}</p>
            <p className="mt-4 text-body font-semibold text-brand-accent-ink">{t('common:footer.strapline')}</p>
          </div>
          <FooterNav
            heading={t('common:footer.platformNav')}
            links={[
              ['/opportunities', t('common:nav.internships')],
              ['/organizations', t('common:nav.organizations')],
              ['/universities', t('common:nav.universities')],
              ['/about', t('common:nav.about')],
            ]}
          />
          <FooterNav
            heading={t('common:remediation.support')}
            links={[
              ['/#how-it-works', t('common:remediation.how')],
              ['/about', t('common:remediation.help')],
              // The PUBLIC privacy policy. This used to point at /account/privacy — the signed-in
              // privacy settings — so an anonymous visitor following it was sent to the login page.
              // The public footer links only to pages a visitor can open.
              ['/legal/privacy-policy', t('privacy:nav.privacy')],
            ]}
          />
          <FooterNav
            heading={t('common:footer.legalNav')}
            links={[
              ['/legal/terms', t('legal:documentTypes.TERMS')],
              ['/legal/privacy-policy', t('legal:documentTypes.PRIVACY_POLICY')],
              ['/legal/cookie-policy', t('legal:documentTypes.COOKIE_POLICY')],
            ]}
          />
        </div>
        <p className="mt-12 border-t border-border py-6 text-caption text-foreground-secondary">
          {t('common:footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}

function FooterNav({ heading, links }: { heading: string; links: string[][] }) {
  return (
    <nav aria-label={heading} className="min-w-0">
      <h2 className="text-label text-foreground">{heading}</h2>
      <ul className="mt-4 space-y-3">
        {links.map(([to, label]) => (
          <li key={`${to}-${label}`}>
            <Link
              to={to}
              className="rounded-sm text-body text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
