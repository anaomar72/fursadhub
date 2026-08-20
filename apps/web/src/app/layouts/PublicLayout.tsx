import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from '../../components/ui'

/** Public marketing/browse shell — home, opportunity browsing, auth pages. */
export function PublicLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandLogo surface="light" />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="surface-dark border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <BrandLogo surface="dark" className="h-8" />
          <p className="mt-3 text-sm text-foreground-secondary">{t('app.tagline')}</p>
        </div>
      </footer>
    </div>
  )
}
