import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  StatusBadge,
  Textarea,
  type DataTableColumn,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import { DetailField } from '../components/DetailField'
import { useEvidenceDownload } from '../hooks/useEvidenceDownload'
import { caseStatusTone } from '../statusTone'
import { formatDateTime } from '../../../lib/utils/formatDate'
import type { EscalatedCase } from '../types'

type EscalationAction = 'verify' | 'reject' | 'request-more-evidence'

/** Commands that must carry a reason the student will be shown. */
const NEEDS_NOTE = new Set<EscalationAction>(['reject', 'request-more-evidence'])

/**
 * Escalated student verification cases (Phase 7 "Admin: verification escalation").
 *
 * <p>The queue is a table; the review happens in a drawer beside it, because deciding a case means
 * reading the claimed enrollment and the escalation reason together and then usually returning to
 * the next case. A separate route per case would make working a queue of ten a queue of twenty
 * navigations.
 *
 * <p>Resolutions use the same frozen transitions a university uses — there is no platform-only
 * state and none is invented here (CLAUDE.md section 30). Evidence is fetched as a blob through the
 * authorized, audited endpoint, never linked to object storage (sections 47, 51).
 *
 * <p>Open to {@code VERIFICATION_OFFICER} as well as {@code SUPER_ADMIN} — {@code requireReviewer}.
 */
export function AdminEscalationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [openCaseId, setOpenCaseId] = useState<string | null>(null)
  const [prompting, setPrompting] = useState<EscalationAction | null>(null)
  const [note, setNote] = useState('')

  const escalationsQuery = useQuery({
    queryKey: ['admin', 'escalations'],
    queryFn: adminApi.listEscalations,
  })

  const cases = escalationsQuery.data ?? []
  const openCase = cases.find((item) => item.caseId === openCaseId) ?? null

  const resolveMutation = useMutation({
    mutationFn: ({
      caseId,
      action,
      reviewNote,
    }: {
      caseId: string
      action: EscalationAction
      reviewNote?: string
    }) => {
      setError(null)
      return adminApi.resolveEscalation(caseId, action, reviewNote).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'escalations', cause))
        throw cause
      })
    },
    // The row leaves the queue only once the API says the case is resolved.
    onSuccess: () => {
      setPrompting(null)
      setNote('')
      setOpenCaseId(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'escalations'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    },
  })

  const columns: DataTableColumn<EscalatedCase>[] = [
    {
      key: 'student',
      header: t('admin:escalations.student'),
      render: (item) => (
        <span className="font-medium text-foreground">
          {item.studentEmail ?? t('admin:escalations.unknownStudent')}
        </span>
      ),
    },
    {
      key: 'enrollment',
      header: t('admin:escalations.enrollment'),
      render: (item) => (
        <span className="text-foreground-secondary">
          {item.studentNumber} · {item.program}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('admin:escalations.status'),
      render: (item) => (
        <StatusBadge tone={caseStatusTone(item.status)}>
          {t(`admin:statusLabels.${item.status}`, item.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'escalatedAt',
      header: t('admin:escalations.escalatedAt'),
      render: (item) => (
        <span className="text-foreground-secondary">{formatDateTime(item.escalatedAt)}</span>
      ),
    },
    {
      key: 'evidence',
      header: t('admin:escalations.evidence'),
      render: (item) =>
        item.hasEvidence ? (
          <span className="text-foreground-secondary">{t('admin:escalations.hasEvidence')}</span>
        ) : (
          <span className="text-muted">{t('admin:escalations.noEvidence')}</span>
        ),
    },
    {
      key: 'open',
      header: <span className="sr-only">{t('admin:escalations.review')}</span>,
      render: (item) => (
        <Button size="sm" variant="outline" onClick={() => setOpenCaseId(item.caseId)}>
          {t('admin:escalations.review')}
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:verification.eyebrow')}
        title={t('admin:escalations.title')}
        description={t('admin:escalations.description')}
      />

      {error && !openCase && <Alert tone="danger">{error}</Alert>}

      {escalationsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : escalationsQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void escalationsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:escalations.resultCount', { count: cases.length })}
          </p>
          <DataTable
            caption={t('admin:escalations.title')}
            columns={columns}
            rows={cases}
            rowKey={(item) => item.caseId}
            empty={
              <EmptyState
                title={t('admin:escalations.empty')}
                description={t('admin:escalations.emptyHint')}
              />
            }
          />
        </>
      )}

      <Drawer
        open={openCase !== null}
        onClose={() => {
          setOpenCaseId(null)
          setPrompting(null)
        }}
        closeLabel={t('common:actions.close')}
        title={t('admin:escalations.review')}
      >
        {openCase && (
          <CaseReview
            item={openCase}
            error={error}
            onError={setError}
            pending={resolveMutation.isPending}
            prompting={prompting}
            note={note}
            onNote={setNote}
            onStart={(action) => {
              if (NEEDS_NOTE.has(action)) {
                setNote('')
                setPrompting(action)
                return
              }
              resolveMutation.mutate({ caseId: openCase.caseId, action })
            }}
            onCancel={() => setPrompting(null)}
            onSubmitNote={() => {
              if (!prompting) return
              resolveMutation.mutate({ caseId: openCase.caseId, action: prompting, reviewNote: note })
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

/** The case as the reviewer reads it, plus the three resolutions the backend accepts. */
function CaseReview({
  item,
  error,
  onError,
  pending,
  prompting,
  note,
  onNote,
  onStart,
  onCancel,
  onSubmitNote,
}: {
  item: EscalatedCase
  error: string | null
  onError: (message: string) => void
  pending: boolean
  prompting: EscalationAction | null
  note: string
  onNote: (value: string) => void
  onStart: (action: EscalationAction) => void
  onCancel: () => void
  onSubmitNote: () => void
}) {
  const { t } = useTranslation()
  const download = useEvidenceDownload(
    () => adminApi.downloadEscalationEvidence(item.caseId),
    'verification-evidence',
    'escalations',
    onError,
  )

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="danger">{error}</Alert>}

      <Card padding="md">
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailField label={t('admin:escalations.student')}>
            {item.studentEmail ?? t('admin:escalations.unknownStudent')}
          </DetailField>
          <DetailField label={t('admin:escalations.status')}>
            <StatusBadge tone={caseStatusTone(item.status)}>
              {t(`admin:statusLabels.${item.status}`, item.status)}
            </StatusBadge>
          </DetailField>
          <DetailField label={t('admin:escalations.studentNumber')}>{item.studentNumber}</DetailField>
          <DetailField label={t('admin:escalations.program')}>{item.program}</DetailField>
          <DetailField label={t('admin:escalations.academicYear')}>{item.academicYear}</DetailField>
          <DetailField label={t('admin:escalations.submittedAt')}>
            {formatDateTime(item.submittedAt)}
          </DetailField>
        </dl>
      </Card>

      {item.escalationReason && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-foreground">
            {t('admin:escalations.escalationReason')}
          </h3>
          <p className="mt-1 text-sm text-foreground-secondary">{item.escalationReason}</p>
        </Card>
      )}

      {item.reviewNotes && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-foreground">{t('admin:escalations.reviewNotes')}</h3>
          <p className="mt-1 text-sm text-foreground-secondary">{item.reviewNotes}</p>
        </Card>
      )}

      {item.hasEvidence ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          loading={download.isPending}
          onClick={() => download.mutate()}
        >
          {t('admin:escalations.viewEvidence')}
        </Button>
      ) : (
        <p className="text-sm text-muted">{t('admin:escalations.noEvidenceHint')}</p>
      )}

      {prompting ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmitNote()
          }}
        >
          <FormField
            label={t(`admin:escalations.actions.${prompting}`)}
            htmlFor="escalation-note"
            hint={t('admin:escalations.noteHint')}
          >
            <Textarea
              id="escalation-note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => onNote(event.target.value)}
              placeholder={t('admin:escalations.notePlaceholder')}
            />
          </FormField>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              variant={prompting === 'reject' ? 'danger' : 'primary'}
              loading={pending}
            >
              {t('common:actions.confirm')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => onStart('verify')}>
            {t('admin:escalations.actions.verify')}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onStart('request-more-evidence')}>
            {t('admin:escalations.actions.request-more-evidence')}
          </Button>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => onStart('reject')}>
            {t('admin:escalations.actions.reject')}
          </Button>
        </div>
      )}
    </div>
  )
}
