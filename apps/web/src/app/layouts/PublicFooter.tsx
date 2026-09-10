import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from '../../components/ui'
import { SkylineArtwork } from '../../components/ui/Presentation'

export function PublicFooter() {
  const { t } = useTranslation()
  return <footer className="surface-dark border-t border-border bg-surface text-foreground">
    <div className="mx-auto max-w-[1448px] px-5 py-5 lg:px-14">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.5fr_.75fr_.75fr_1fr_1.3fr_1.4fr] lg:gap-7">
        <div className="lg:border-e lg:border-white/15 lg:pe-6"><BrandLogo surface="dark" /><p className="mt-2 max-w-xs text-xs leading-5 text-foreground-secondary">{t('common:footer.description')}</p></div>
        <FooterNav heading={t('common:footer.platformNav')} links={[['/opportunities', t('common:nav.internships')], ['/organizations', t('common:nav.organizations')], ['/universities', t('common:nav.universities')], ['/about', t('common:nav.about')]]} />
        <FooterNav heading={t('common:remediation.support')} links={[['/about', t('common:remediation.help')], ['/#how-it-works', t('common:remediation.how')], ['/account/privacy', t('privacy:nav.privacy')]]} />
        <FooterNav heading={t('common:footer.legalNav')} links={[['/legal/terms', t('legal:documentTypes.TERMS')], ['/legal/privacy-policy', t('legal:documentTypes.PRIVACY_POLICY')], ['/legal/cookie-policy', t('legal:documentTypes.COOKIE_POLICY')]]} />
        <div><h2 className="text-xs font-bold">{t('common:remediation.updates')}</h2><p className="mt-2 text-xs leading-5 text-foreground-secondary">{t('common:remediation.updatesBody')}</p><Link to="/opportunities" className="mt-3 inline-flex min-h-9 items-center rounded bg-brand-accent px-3 text-xs font-bold text-white focus-visible:ring-2">{t('common:remediation.explore')} →</Link></div>
        <div className="flex flex-col justify-end"><SkylineArtwork className="h-24 w-full brightness-0 invert opacity-40" /><p className="mt-2 text-right text-[11px] text-foreground-secondary">{t('common:footer.strapline')}</p></div>
      </div>
      <p className="mt-4 border-t border-white/10 pt-3 text-center text-[11px] text-foreground-secondary">{t('common:footer.copyright', { year: new Date().getFullYear() })}</p>
    </div>
  </footer>
}
function FooterNav({ heading, links }: { heading: string; links: string[][] }) {
  return <nav aria-label={heading}><h2 className="text-xs font-bold">{heading}</h2><ul className="mt-2 space-y-1.5 text-xs text-foreground-secondary">{links.map(([to, label]) => <li key={to}><Link to={to} className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">{label}</Link></li>)}</ul></nav>
}
