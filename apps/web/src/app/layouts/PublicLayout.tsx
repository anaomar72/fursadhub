import { Outlet } from 'react-router-dom'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'
import { useTranslation } from 'react-i18next'

export function PublicLayout() {
  const { t } = useTranslation()
  return <div className="public-site flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background">
    <a href="#main-content" className="sr-only fixed start-4 top-2 z-50 rounded-lg bg-surface p-3 text-foreground shadow-lg focus:not-sr-only">{t('common:a11y.skipToContent')}</a>
    <PublicHeader />
    <main id="main-content" tabIndex={-1} className="min-w-0 flex-1"><Outlet /></main>
    <PublicFooter />
  </div>
}
