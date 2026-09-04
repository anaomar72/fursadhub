import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { AnimatedCheck, Button, ErrorState, LoadingState, StatusBadge, Textarea } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as finalReportsApi from '../api/finalReportsApi'
import type { FinalReportState } from '../types'

const STATE_TONE: Record<FinalReportState, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  NEEDS_REVISION: 'warning',
  APPROVED: 'success',
}

interface FinalReportPageProps {
  /** The owning student uploads and submits; a university reviewer approves or returns. */
  audience: 'student' | 'reviewer'
}

/**
 * The student's final internship report.
 *
 * <p>The document is private throughout. There is no link to object storage anywhere on this page:
 * downloading fetches the bytes through the authorized, audited API endpoint and hands the browser a
 * short-lived blob, so nothing here could be copied and shared as a URL (CLAUDE.md section 47).
 */
export function FinalReportPage({ audience }: FinalReportPageProps) {
  const { t } = useTranslation()
  const { placementId } = useParams<{ placementId: string }>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [returning, setReturning] = useState(false)
  const [justApproved, setJustApproved] = useState(false)

  const reportQuery = useQuery({
    queryKey: ['final-report', placementId],
    queryFn: () => finalReportsApi.getFinalReport(placementId!),
    enabled: !!placementId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['final-report', placementId] })
    void queryClient.invalidateQueries({ queryKey: ['placement-completion', placementId] })
  }

  function run<T>(promise: Promise<T>) {
    setError(null)
    return promise.catch((cause) => {
      setError(apiErrorMessage(t, 'internship', 'finalReport', cause))
      throw cause
    })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => run(finalReportsApi.uploadFinalReportDocument(placementId!, file)),
    onSuccess: invalidate,
  })
  const submitMutation = useMutation({
    mutationFn: () => run(finalReportsApi.submitFinalReport(placementId!)),
    onSuccess: invalidate,
  })
  const reviseMutation = useMutation({
    mutationFn: (comment: string) => run(finalReportsApi.requestFinalReportRevision(placementId!, comment)),
    onSuccess: () => {
      setReturning(false)
      setReviewComment('')
      invalidate()
    },
  })
  const approveMutation = useMutation({
    mutationFn: () => run(finalReportsApi.approveFinalReport(placementId!)),
    onSuccess: () => {
      // A one-time confirmation, then the stable APPROVED state remains
      // (BRAND_AND_UI_GUIDELINES.md section 14). Never replayed on re-render.
      setJustApproved(true)
      invalidate()
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const blob = await run(finalReportsApi.downloadFinalReportDocument(placementId!))
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = report?.documentFilename ?? 'final-report.pdf'
      anchor.click()
      // Released immediately so the blob does not outlive the click that needed it.
      URL.revokeObjectURL(objectUrl)
    },
  })

  if (reportQuery.isLoading) {
    return <LoadingState label={t('common:status.loading')} />
  }

  if (reportQuery.isError) {
    return (
      <ErrorState
        title={t('common:status.error')}
        onRetry={() => void reportQuery.refetch()}
        retryLabel={t('common:actions.retry')}
      />
    )
  }

  const report = reportQuery.data ?? null
  const busy =
    uploadMutation.isPending ||
    submitMutation.isPending ||
    reviseMutation.isPending ||
    approveMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t('internship:finalReport.title')}</h2>
        {report && (
          <StatusBadge tone={STATE_TONE[report.state]}>
            {t(`internship:finalReport.stateValues.${report.state}`)}
          </StatusBadge>
        )}
      </div>

      {justApproved && report?.state === 'APPROVED' && (
        <div className="flex justify-center py-4">
          <AnimatedCheck label={t('internship:finalReport.approvedConfirmation')} />
        </div>
      )}

      {!report && audience === 'reviewer' && (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-foreground-secondary">
          {t('internship:finalReport.notSubmittedYet')}
        </p>
      )}

      {report?.reviewComment && (
        <p
          className={
            report.state === 'NEEDS_REVISION'
              ? 'rounded-md bg-warning-bg px-3 py-2 text-sm text-warning'
              : 'rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground-secondary'
          }
        >
          {t('internship:finalReport.reviewComment', { comment: report.reviewComment })}
        </p>
      )}

      {report?.hasDocument && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{report.documentFilename}</p>
            <p className="text-xs text-foreground-secondary">
              {t('internship:finalReport.documentSize', {
                size: Math.max(1, Math.round((report.documentSizeBytes ?? 0) / 1024)),
              })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            loading={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate()}
          >
            {t('internship:finalReport.actions.download')}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {audience === 'student' && (!report || report.fileEditable) && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <label htmlFor="report-file" className="text-sm font-medium text-foreground">
            {t('internship:finalReport.uploadLabel')}
          </label>
          <input
            id="report-file"
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                uploadMutation.mutate(file)
              }
            }}
            disabled={busy}
          />
          <p className="text-xs text-foreground-secondary">{t('internship:finalReport.uploadHint')}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {audience === 'student' && report?.hasDocument && report.fileEditable && (
          <Button loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
            {t('internship:finalReport.actions.submit')}
          </Button>
        )}

        {audience === 'reviewer' && report?.state === 'SUBMITTED' && !returning && (
          <>
            <Button loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
              {t('internship:finalReport.actions.approve')}
            </Button>
            <Button variant="outline" onClick={() => setReturning(true)} disabled={busy}>
              {t('internship:finalReport.actions.requestRevision')}
            </Button>
          </>
        )}
      </div>

      {returning && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <label htmlFor="revision-comment" className="text-sm font-medium text-foreground">
            {t('internship:finalReport.revisionLabel')}
          </label>
          <Textarea
            id="revision-comment"
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder={t('internship:finalReport.revisionPlaceholder')}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={reviseMutation.isPending}
              disabled={!reviewComment.trim()}
              onClick={() => reviseMutation.mutate(reviewComment.trim())}
            >
              {t('internship:finalReport.actions.confirmRevision')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReturning(false)} disabled={busy}>
              {t('internship:actions.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
