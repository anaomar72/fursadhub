import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '../../../components/ui'
import { ApiError } from '../../../lib/api/client'
import { formatDate } from '../../../lib/utils/formatDate'
import * as legalApi from '../api/legalApi'
import type { LegalDocumentType } from '../types'

interface LegalDocumentPageProps {
  documentType: LegalDocumentType
}

/**
 * A public legal document (CLAUDE.md section 49).
 *
 * <p>Unauthenticated: the terms must be readable before anyone decides to register. The document is
 * fetched in the reader's current UI language, and when only an English version has been published
 * the page says so rather than letting the reader assume they are looking at a translation.
 */
export function LegalDocumentPage({ documentType }: LegalDocumentPageProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  const documentQuery = useQuery({
    queryKey: ['legal-document', documentType, locale],
    queryFn: () => legalApi.getPublicLegalDocument(documentType, locale),
    retry: false,
  })

  if (documentQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (documentQuery.isError) {
    const notPublished =
      documentQuery.error instanceof ApiError && documentQuery.error.body.code === 'LEGAL_DOCUMENT_NOT_FOUND'
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-xl font-semibold text-foreground">
          {t(`legal:documentTypes.${documentType}`)}
        </h1>
        <p className="mt-3 text-sm text-foreground-secondary">
          {notPublished ? t('legal:notPublished') : t('legal:loadFailed')}
        </p>
      </div>
    )
  }

  const document = documentQuery.data!
  const isFallbackLanguage = document.locale !== locale

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">{document.title}</h1>
        <p className="text-sm text-foreground-secondary">
          {t('legal:versionEffective', {
            version: document.version,
            date: formatDate(document.effectiveFrom),
          })}
        </p>
      </header>

      {isFallbackLanguage && (
        <p
          role="status"
          className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-secondary"
        >
          {t('legal:translationUnavailable')}
        </p>
      )}

      {/*
        Rendered as plain text with preserved line breaks, never as HTML. The body is authored in the
        admin console and injecting it as markup would turn a legal page into a script-execution
        surface on FursadHub's own origin.
      */}
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{document.body}</div>
    </article>
  )
}
