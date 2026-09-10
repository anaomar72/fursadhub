import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon, LoadingSpinner } from '../../../components/ui'
import { ApiError } from '../../../lib/api/client'
import { formatDate } from '../../../lib/utils/formatDate'
import * as legalApi from '../api/legalApi'
import type { LegalDocumentType } from '../types'

interface LegalDocumentPageProps {
  documentType: LegalDocumentType
}

/** The three published legal surfaces, so a reader can move between them without going back. */
const DOCUMENT_ROUTES: Record<LegalDocumentType, string> = {
  TERMS: '/legal/terms',
  PRIVACY_POLICY: '/legal/privacy-policy',
  COOKIE_POLICY: '/legal/cookie-policy',
}

/**
 * A public legal document (CLAUDE.md section 49), in the approved public presentation language.
 *
 * <p>Unauthenticated: the terms must be readable before anyone decides to register. The document is
 * fetched in the reader's current UI language, and when only an English version has been published
 * the page says so rather than letting the reader assume they are looking at a translation.
 *
 * <p>The layout is chrome only. The BODY is rendered exactly as the admin console published it —
 * not reflowed, summarised, re-headed or abridged — because the wording of a legal document is the
 * document. Everything this page adds (the identity band, the version line, the sibling-document
 * rail) sits outside the text.
 */
export function LegalDocumentPage({ documentType }: LegalDocumentPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  const documentQuery = useQuery({
    queryKey: ['legal-document', documentType, locale],
    queryFn: () => legalApi.getPublicLegalDocument(documentType, locale),
    retry: false,
  })

  const siblings = (Object.keys(DOCUMENT_ROUTES) as LegalDocumentType[]).filter(
    (type) => type !== documentType,
  )

  if (documentQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" label={t('common:status.loading')} />
      </div>
    )
  }

  const notPublished =
    documentQuery.isError &&
    documentQuery.error instanceof ApiError &&
    documentQuery.error.body.code === 'LEGAL_DOCUMENT_NOT_FOUND'

  const document = documentQuery.data
  const isFallbackLanguage = document ? document.locale !== locale : false

  return (
    <div className="overflow-x-clip bg-background">
      {/* ------------------------------------------------------------ identity band */}
      <header className="border-b border-border bg-brand-navy text-white">
        <div className="mx-auto max-w-[1448px] px-4 py-10 sm:px-6 lg:px-[54px]">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-accent">
            {t('legal:page.eyebrow')}
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {document?.title ?? t(`legal:documentTypes.${documentType}`)}
          </h1>
          {document && (
            <p className="mt-3 text-sm text-white/70">
              {t('legal:versionEffective', {
                version: document.version,
                date: formatDate(document.effectiveFrom),
              })}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1448px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)] lg:px-[54px]">
        {/* ---------------------------------------------------------- document */}
        <article className="min-w-0">
          {documentQuery.isError ? (
            <div className="rounded-xl border border-border bg-surface p-8 shadow-xs">
              <p className="text-sm text-foreground-secondary">
                {notPublished ? t('legal:notPublished') : t('legal:loadFailed')}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs sm:p-10">
              {isFallbackLanguage && (
                <p
                  role="status"
                  className="mb-6 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-foreground-secondary"
                >
                  {t('legal:translationUnavailable')}
                </p>
              )}

              {/*
                Rendered as plain text with preserved line breaks, never as HTML. The body is
                authored in the admin console and injecting it as markup would turn a legal page
                into a script-execution surface on FursadHub's own origin.

                `max-w-prose` bounds the measure for readability; it does not alter the text.
              */}
              <div className="max-w-prose whitespace-pre-wrap text-sm leading-7 text-foreground">
                {document!.body}
              </div>
            </div>
          )}
        </article>

        {/* ---------------------------------------------------------- sibling documents */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav
            aria-labelledby="legal-siblings"
            className="rounded-xl border border-border bg-surface p-6 shadow-xs"
          >
            <h2
              id="legal-siblings"
              className="font-display text-base font-bold text-brand-navy dark:text-foreground"
            >
              {t('legal:page.otherDocuments')}
            </h2>
            <ul className="mt-4 space-y-2">
              {siblings.map((type) => (
                <li key={type}>
                  <Link
                    to={DOCUMENT_ROUTES[type]}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-link transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                  >
                    {t(`legal:documentTypes.${type}`)}
                    <Icon name="chevronRight" className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 rounded text-sm font-semibold text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Icon name="chevronLeft" className="size-4" aria-hidden="true" />
              {t('legal:page.backToHome')}
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  )
}
