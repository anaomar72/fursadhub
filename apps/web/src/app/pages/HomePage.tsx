import { useTranslation } from 'react-i18next'

/**
 * Phase 0 placeholder home page — proves the app shell, routing, design
 * tokens, and i18n wiring end to end. Real opportunity browsing/discovery
 * content is built starting Phase 3 (CLAUDE.md section 32).
 */
export function HomePage() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{t('app.name')}</h1>
      <p className="mt-3 text-lg text-foreground-secondary">{t('app.tagline')}</p>
    </section>
  )
}
