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
    // A <main> rather than a <div>: this page renders standalone, outside the layouts that supply
    // the landmark elsewhere, so without it the 404 was the one page in the product with no main
    // landmark for a screen reader to jump to.
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center">
      <BrandLogo />
      <div className="space-y-2">
        {/* Decorative: the digits repeat what the heading already says, so they are not announced
            twice. The <h1> carries the actual message. */}
        <p aria-hidden="true" className="font-display text-display-xl text-brand-accent-ink">404</p>
        <h1 className="font-display text-title-page text-foreground">{t('common:notFound.title')}</h1>
        <p className="mx-auto max-w-sm text-body-lg text-foreground-secondary">{t('common:notFound.description')}</p>
      </div>
      <ButtonLink to="/" size="lg">{t('common:notFound.action')}</ButtonLink>
    </main>
  )
}
