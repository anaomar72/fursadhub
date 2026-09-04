import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  type DataTableColumn,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import type { LegalDocument, LegalDocumentType } from '../../legal/types'
import * as adminApi from '../api/adminApi'
import { formatDate } from '../../../lib/utils/formatDate'

const DOCUMENT_TYPES: LegalDocumentType[] = ['TERMS', 'PRIVACY_POLICY', 'COOKIE_POLICY']

/**
 * Publishing versioned legal documents (CLAUDE.md section 49).
 *
 * <p>There is no edit form and no delete control on this page, and no endpoint behind either. A
 * published version is immutable: correcting the wording means publishing a NEW version, which is
 * what keeps every recorded acceptance meaningful — an acceptance of a document that was later
 * silently rewritten records nothing at all.
 *
 * <p>Each version is published in one locale, which is why the same document appears twice in the
 * table. English and Somali are separate rows because they are separate publications, not two
 * renderings of one (CLAUDE.md section 49).
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

  const columns: DataTableColumn<LegalDocument>[] = [
    {
      key: 'title',
      header: t('admin:legalDocuments.documentTitle'),
      render: (document) => <span className="font-medium text-foreground">{document.title}</span>,
    },
    {
      key: 'type',
      header: t('admin:legalDocuments.documentType'),
      render: (document) => (
        <span className="text-foreground-secondary">
          {t(`legal:documentTypes.${document.documentType}`)}
        </span>
      ),
    },
    {
      key: 'version',
      header: t('admin:legalDocuments.version'),
      render: (document) => <span className="font-mono text-xs text-foreground">{document.version}</span>,
    },
    {
      key: 'locale',
      header: t('admin:legalDocuments.locale'),
      render: (document) => (
        <span className="text-foreground-secondary">
          {t(`common:language.${document.locale}`, document.locale)}
        </span>
      ),
    },
    {
      key: 'effectiveFrom',
      header: t('admin:legalDocuments.effectiveFrom'),
      className: 'whitespace-nowrap',
      render: (document) => (
        <span className="text-foreground-secondary">{formatDate(document.effectiveFrom)}</span>
      ),
    },
    {
      key: 'status',
      header: t('admin:legalDocuments.published'),
      render: (document) => (
        <StatusBadge tone={document.publishedAt ? 'success' : 'neutral'}>
          {document.publishedAt
            ? t('admin:legalDocuments.statusPublished')
            : t('admin:legalDocuments.statusDraft')}
        </StatusBadge>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:legalDocuments.title')}
        description={t('admin:legalDocuments.description')}
      />

      <Card padding="lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            publishMutation.mutate()
          }}
        >
          <div>
            <h2 className="font-semibold text-foreground">{t('admin:legalDocuments.publishHeading')}</h2>
            <p className="text-sm text-foreground-secondary">
              {t('admin:legalDocuments.immutableNotice')}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="flex justify-end">
            <Button type="submit" loading={publishMutation.isPending}>
              {t('admin:legalDocuments.publish')}
            </Button>
          </div>
        </form>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">{t('admin:legalDocuments.published')}</h2>
        {documentsQuery.isLoading ? (
          <LoadingState label={t('common:status.loading')} />
        ) : documentsQuery.isError ? (
          <ErrorState
            title={t('common:status.error')}
            onRetry={() => void documentsQuery.refetch()}
            retryLabel={t('common:actions.retry')}
          />
        ) : (
          <DataTable
            caption={t('admin:legalDocuments.published')}
            columns={columns}
            rows={documentsQuery.data ?? []}
            rowKey={(document) => document.id}
            empty={<EmptyState title={t('admin:legalDocuments.empty')} />}
          />
        )}
      </section>
    </div>
  )
}
