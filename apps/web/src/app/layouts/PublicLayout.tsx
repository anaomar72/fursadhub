import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from '../../components/ui'

/** Public marketing/browse shell — home, opportunity browsing, auth pages. */
export function PublicLayout() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const navLinkClass = 'text-sm font-medium text-foreground-secondary transition-colors duration-150 ease-in-out hover:text-foreground'

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
            <BrandLogo surface="light" />
          </Link>

          <nav className="hidden items-center gap-6 sm:flex" aria-label={t('common:footer.siteNav')}>
            <Link to="/#how-it-works" className={navLinkClass}>
              {t('common:nav.howItWorks')}
            </Link>
            <Link to="/opportunities" className={navLinkClass}>
              {t('opportunities:public.title')}
            </Link>
            <Link to="/login" className={navLinkClass}>
              {t('auth:register.signIn')}
            </Link>
            <Link
              to="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-brand-primary px-4 text-sm font-medium text-on-brand transition-colors duration-150 ease-in-out hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              {t('common:nav.register')}
            </Link>
          </nav>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-foreground transition-colors duration-150 ease-in-out hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary sm:hidden"
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            aria-label={menuOpen ? t('common:nav.closeMenu') : t('common:nav.openMenu')}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {menuOpen && (
          <nav
            id="public-mobile-menu"
            aria-label={t('common:footer.siteNav')}
            className="animate-menu-in motion-reduce:animate-none border-t border-border bg-surface px-4 py-4 sm:hidden"
          >
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  to="/#how-it-works"
                  onClick={closeMenu}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                >
                  {t('common:nav.howItWorks')}
                </Link>
              </li>
              <li>
                <Link
                  to="/opportunities"
                  onClick={closeMenu}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                >
                  {t('opportunities:public.title')}
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                >
                  {t('auth:register.signIn')}
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-brand-primary text-sm font-medium text-on-brand transition-colors duration-150 ease-in-out hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  {t('common:nav.register')}
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="surface-dark border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div>
              <BrandLogo surface="dark" className="h-8" />
              <p className="mt-3 max-w-xs text-sm text-foreground-secondary">{t('common:footer.description')}</p>
            </div>

            <nav aria-label={t('common:footer.siteNav')}>
              <h2 className="text-sm font-semibold text-foreground">{t('common:footer.siteNav')}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link to="/" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('common:footer.home')}
                  </Link>
                </li>
                <li>
                  <Link to="/#how-it-works" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('common:footer.howItWorks')}
                  </Link>
                </li>
                <li>
                  <Link to="/opportunities" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('common:footer.opportunities')}
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('auth:register.signIn')}
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('common:nav.register')}
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label={t('common:footer.legalNav')}>
              <h2 className="text-sm font-semibold text-foreground">{t('common:footer.legalNav')}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link to="/legal/terms" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('legal:documentTypes.TERMS')}
                  </Link>
                </li>
                <li>
                  <Link to="/legal/privacy-policy" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('legal:documentTypes.PRIVACY_POLICY')}
                  </Link>
                </li>
                <li>
                  <Link to="/legal/cookie-policy" className="text-sm text-foreground-secondary hover:text-foreground">
                    {t('legal:documentTypes.COOKIE_POLICY')}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <p className="mt-10 border-t border-border pt-6 text-xs text-foreground-secondary">
            {t('common:footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
