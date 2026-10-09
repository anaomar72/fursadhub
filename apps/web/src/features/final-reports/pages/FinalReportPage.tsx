import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { AnimatedCheck, Button, ConfirmationDialog, ErrorState, FileUpload, SkeletonList, StatusBadge, Textarea, EmptyState } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as finalReportsApi from '../api/finalReportsApi'
import { FINAL_REPORT_STATE_TONE } from '../../../lib/status/statusTones'

const STATE_TONE = FINAL_REPORT_STATE_TONE

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
  const [confirmingApproval, setConfirmingApproval] = useState(false)
  const approveMutation = useMutation({
    mutationFn: () => run(finalReportsApi.approveFinalReport(placementId!)),
    onSettled: () => setConfirmingApproval(false),
    onSuccess: () => {
      // A one-time confirmation, then the stable APPROVED state remains
      // (CLAUDE.md section 58). Never replayed on re-render.
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
    return <SkeletonList rows={3} />
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
        <EmptyState
          title={t('internship:finalReport.notSubmittedYet')}
          description={t('internship:finalReport.notSubmittedYetHint')}
        />
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

      {audience === 'student' && (
        // What to do next, for the state the report is in — never a promise about review time.
        <p className="text-body text-foreground-secondary">
          {t(`internship:finalReport.studentNext.${report?.state ?? 'MISSING'}`)}
        </p>
      )}

      {audience === 'student' && (!report || report.fileEditable) && (
        // The standard upload zone: PDF only (FileClassification), with its busy state and the
        // file on record shown inside it, so choosing again is visibly a replacement.
        <FileUpload
          label={t('internship:finalReport.uploadLabel')}
          hint={t('internship:finalReport.uploadHint')}
          accept="application/pdf"
          disabled={busy && !uploadMutation.isPending}
          busy={uploadMutation.isPending}
          busyLabel={t('internship:finalReport.uploading')}
          current={report?.hasDocument ? (report.documentFilename ?? undefined) : undefined}
          onFiles={(files) => files[0] && uploadMutation.mutate(files[0])}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {audience === 'student' && report?.hasDocument && report.fileEditable && (
          <Button loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
            {t('internship:finalReport.actions.submit')}
          </Button>
        )}

        {audience === 'reviewer' && report?.state === 'SUBMITTED' && !returning && (
          <>
            {/* Approval is final — an approved report cannot be returned — so it is confirmed first. */}
            <Button loading={approveMutation.isPending} disabled={busy} onClick={() => setConfirmingApproval(true)}>
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

      <ConfirmationDialog
        open={confirmingApproval}
        onClose={() => setConfirmingApproval(false)}
        loading={approveMutation.isPending}
        title={t('internship:finalReport.confirmApprove.title')}
        description={t('internship:finalReport.confirmApprove.body')}
        confirmLabel={t('internship:finalReport.actions.approve')}
        cancelLabel={t('internship:finalReport.confirmApprove.keep')}
        onConfirm={() => approveMutation.mutate()}
      />
    </div>
  )
}
