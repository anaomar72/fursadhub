import { useTranslation } from 'react-i18next'
import { BrandLogo, ButtonLink } from '../../components/ui'

/**
 * The catch-all route (CLAUDE.md section 61 — every unmatched path across every area, public or
 * authenticated, lands here). It renders standalone rather than inside any area's shell: a lost
 * `/student/...` URL should not have to guess at auth state to pick the right layout, and a plain,
 * always-available "go home" link is a safer escape hatch than trying to reconstruct one.
 */
export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center">
      <BrandLogo />
      <div className="space-y-2">
        <p className="font-display text-6xl font-extrabold tracking-tight text-brand-navy dark:text-foreground">404</p>
        <h1 className="text-xl font-bold text-foreground">{t('common:notFound.title')}</h1>
        <p className="max-w-sm text-sm text-foreground-secondary">{t('common:notFound.description')}</p>
      </div>
      <ButtonLink to="/">{t('common:notFound.action')}</ButtonLink>
    </div>
  )
}
