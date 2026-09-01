import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, FormField, Input, LoadingSpinner, PageHeader, Select, StatusBadge, Textarea } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import type { LegalDocumentType } from '../../legal/types'
import * as adminApi from '../api/adminApi'

const DOCUMENT_TYPES: LegalDocumentType[] = ['TERMS', 'PRIVACY_POLICY', 'COOKIE_POLICY']

/**
 * Publishing versioned legal documents (CLAUDE.md section 49).
 *
 * <p>There is no edit form and no delete control on this page, and no endpoint behind either. A
 * published version is immutable: correcting the wording means publishing a NEW version, which is
 * what keeps every recorded acceptance meaningful.
 */
export function AdminLegalDocumentsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<LegalDocumentType>('TERMS')
  const [version, setVersion] = useState('')
  const [locale, setLocale] = useState('en')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10))

  const documentsQuery = useQuery({
    queryKey: ['admin', 'legal-documents'],
    queryFn: adminApi.listLegalDocuments,
  })

  const publishMutation = useMutation({
    mutationFn: () => {
      setError(null)
      return adminApi
        .publishLegalDocument({ documentType, version, locale, title, body, effectiveFrom })
        .catch((cause) => {
          setError(apiErrorMessage(t, 'admin', 'legalDocuments', cause))
          throw cause
        })
    },
    onSuccess: () => {
      setVersion('')
      setTitle('')
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'legal-documents'] })
      void queryClient.invalidateQueries({ queryKey: ['legal-status'] })
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeader title={t('admin:legalDocuments.title')} />
        <p className="mt-1 text-sm text-foreground-secondary">{t('admin:legalDocuments.description')}</p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault()
          publishMutation.mutate()
        }}
      >
        <h2 className="text-sm font-medium text-foreground">{t('admin:legalDocuments.publishHeading')}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('admin:legalDocuments.documentType')} htmlFor="legal-type">
            <Select
              id="legal-type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as LegalDocumentType)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`legal:documentTypes.${type}`)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('admin:legalDocuments.locale')} htmlFor="legal-locale">
            <Select id="legal-locale" value={locale} onChange={(event) => setLocale(event.target.value)}>
              <option value="en">{t('common:language.en')}</option>
              <option value="so">{t('common:language.so')}</option>
            </Select>
          </FormField>

          <FormField label={t('admin:legalDocuments.version')} htmlFor="legal-version">
            <Input
              id="legal-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              maxLength={40}
              required
              placeholder={t('admin:legalDocuments.versionPlaceholder')}
            />
          </FormField>

          <FormField label={t('admin:legalDocuments.effectiveFrom')} htmlFor="legal-effective">
            <Input
              id="legal-effective"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField label={t('admin:legalDocuments.documentTitle')} htmlFor="legal-title">
          <Input
            id="legal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            required
          />
        </FormField>

        <FormField label={t('admin:legalDocuments.body')} htmlFor="legal-body">
          <Textarea
            id="legal-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={10}
            required
          />
        </FormField>

        <p className="text-xs text-foreground-secondary">{t('admin:legalDocuments.immutableNotice')}</p>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={publishMutation.isPending} disabled={publishMutation.isPending}>
            {t('admin:legalDocuments.publish')}
          </Button>
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">{t('admin:legalDocuments.published')}</h2>
        {documentsQuery.isLoading ? (
          <LoadingSpinner />
        ) : (documentsQuery.data ?? []).length === 0 ? (
          <EmptyState title={t('admin:legalDocuments.empty')} />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {(documentsQuery.data ?? []).map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{document.title}</p>
                  <p className="text-xs text-foreground-secondary">
                    {t('admin:legalDocuments.summary', {
                      type: t(`legal:documentTypes.${document.documentType}`),
                      version: document.version,
                      locale: document.locale,
                      date: new Date(document.effectiveFrom).toLocaleDateString(),
                    })}
                  </p>
                </div>
                <StatusBadge tone={document.publishedAt ? 'success' : 'neutral'}>
                  {document.publishedAt
                    ? t('admin:legalDocuments.statusPublished')
                    : t('admin:legalDocuments.statusDraft')}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
