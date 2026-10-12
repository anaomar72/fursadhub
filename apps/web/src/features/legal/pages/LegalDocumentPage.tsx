import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState, Icon, SkeletonRegion, SkeletonText } from '../../../components/ui'
import { PublicContainer } from '../../../app/layouts/PublicContainer'
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
 * A public legal document (CLAUDE.md section 49), on the public site.
 *
 * <p>Unauthenticated: the terms must be readable before anyone decides to register. The document is
 * fetched in the reader's current UI language, and when only an English version has been published
 * the page says so rather than letting the reader assume they are looking at a translation.
 *
 * <p>The layout is chrome only. The BODY is rendered exactly as the admin console published it —
 * not reflowed, summarised, re-headed or abridged — because the wording of a legal document is the
 * document. Everything this page adds (the title band, the version line, the sibling-document
 * list) sits outside the text, and the body sits on the page at a readable measure rather than in a
 * card. The title band stays on screen while the document loads.
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

  const notPublished =
    documentQuery.isError &&
    documentQuery.error instanceof ApiError &&
    documentQuery.error.body.code === 'LEGAL_DOCUMENT_NOT_FOUND'

  const document = documentQuery.data
  const isFallbackLanguage = document ? document.locale !== locale : false

  return (
    <div className="bg-background">
      {/* ------------------------------------------------------------ title band */}
      <header className="border-b border-border bg-surface">
        <PublicContainer className="py-10 lg:py-14">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-accent-ink">{t('legal:page.eyebrow')}</p>
          <h1 className="mt-3 max-w-3xl break-words font-display text-display-lg text-foreground">
            {document?.title ?? t(`legal:documentTypes.${documentType}`)}
          </h1>
          {document && (
            <p className="mt-3 text-body text-foreground-secondary">
              {t('legal:versionEffective', {
                version: document.version,
                date: formatDate(document.effectiveFrom),
              })}
            </p>
          )}
        </PublicContainer>
      </header>

      <PublicContainer className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16 lg:py-14">
        {/* ---------------------------------------------------------- document */}
        <article className="min-w-0">
          {documentQuery.isLoading ? (
            <SkeletonRegion>
              <SkeletonText lines={8} className="max-w-prose" />
            </SkeletonRegion>
          ) : documentQuery.isError ? (
            <EmptyState icon="document" title={notPublished ? t('legal:notPublished') : t('legal:loadFailed')} />
          ) : (
            <>
              {isFallbackLanguage && (
                <p role="status" className="mb-8 max-w-prose rounded-lg border border-border bg-surface-muted px-4 py-3 text-body text-foreground-secondary">
                  {t('legal:translationUnavailable')}
                </p>
              )}
              {/*
                Rendered as plain text with preserved line breaks, never as HTML. The body is authored
                in the admin console and injecting it as markup would turn a legal page into a
                script-execution surface on FursadHub's own origin. `max-w-prose` bounds the measure
                for readability; it does not alter the text.
              */}
              <div className="max-w-prose whitespace-pre-wrap break-words text-body-lg text-foreground">{document!.body}</div>
            </>
          )}
        </article>

        {/* ---------------------------------------------------------- sibling documents */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-labelledby="legal-siblings" className="border-t border-border pt-6 lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
            <h2 id="legal-siblings" className="text-label text-foreground-secondary">
              {t('legal:page.otherDocuments')}
            </h2>
            <ul className="mt-3 space-y-1">
              {siblings.map((type) => (
                <li key={type}>
                  <Link
                    to={DOCUMENT_ROUTES[type]}
                    className="-mx-2 flex min-h-10 items-center justify-between gap-3 rounded-md px-2 text-body font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                  >
                    {t(`legal:documentTypes.${type}`)}
                    <Icon name="chevronRight" className="size-4 shrink-0 text-muted rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Icon name="chevronLeft" className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t('legal:page.backToHome')}
            </Link>
          </nav>
        </aside>
      </PublicContainer>
    </div>
  )
}
