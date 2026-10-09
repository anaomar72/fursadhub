import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { universityQueries, VERIFICATION_DEPENDENT_KEYS } from '../universityQueries'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { saveBlob } from '../../../lib/api/privateDocument'
import {
  Alert,
  AnimatedCheck,
  Breadcrumbs,
  Button,
  ConfirmationDialog,
  ErrorState,
  FormField,
  Input,
  Modal,
  PageHeader,
  Panel,
  SkeletonPanel,
  StatusBadge,
  Textarea,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { PrivateDocumentPreview } from '../../../components/ui/PrivateDocumentPreview'
import { ProfessionalProfileSummary } from '../../student/components/ProfessionalProfileSummary'
import { formatDateTime } from '../../../lib/utils/formatDate'
import { ENROLLMENT_VERIFICATION_TONE, toneOf } from '../../../lib/status/statusTones'

/**
 * One student verification case, as its university reviews it (CLAUDE.md sections 29-30).
 *
 * <p>Phase 7 layout: the main column is what the reviewer judges — the enrollment claim, the
 * evidence document, the student's own profile; the side column is what they decide — the status,
 * the commands this state allows, the account-binding code and escalation. On a phone the decision
 * sits between the claim and the evidence, so the current action is never below a full document.
 *
 * <p>The commands are exactly the backend's ({@code VerificationReviewService}): begin review from
 * SUBMITTED; verify, request more evidence (with notes) and reject (with notes) from SUBMITTED or
 * UNDER_REVIEW; revoke a VERIFIED case, {@code UNIVERSITY_ADMIN} only. Rejecting and revoking end
 * the case for the student, so both are confirmed first. Escalation hands the case to the platform
 * without changing its status. The badge re-renders only from the refetched case — never from an
 * optimistic guess about what a transition did.
 */
export function VerificationCaseDetailPage() {
  const { t } = useTranslation()
  const { caseId } = useParams<{ caseId: string }>()
  const { universityId, role } = useUniversityMembership()
  const queryClient = useQueryClient()

  const [notes, setNotes] = useState('')
  const [revokeNotes, setRevokeNotes] = useState('')
  const [challengeCode, setChallengeCode] = useState('')
  const [escalating, setEscalating] = useState(false)
  const [escalationNotes, setEscalationNotes] = useState('')
  const [confirming, setConfirming] = useState<'reject' | 'revoke' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const caseQuery = useQuery({
    queryKey: ['university', 'verification-case', caseId],
    queryFn: () => universityApi.getVerificationCase(universityId, caseId!),
    enabled: !!caseId,
  })
  const departmentsQuery = useQuery(universityQueries.departments(universityId))

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['university', 'verification-case', caseId] })
    // The queue (every filter) and the directory both show this case's status.
    for (const key of VERIFICATION_DEPENDENT_KEYS) void queryClient.invalidateQueries({ queryKey: [...key] })
  }

  /** Every command shares one failure path, so a refusal always reads the same way. */
  function command<T>(run: () => Promise<T>, after?: () => void) {
    setError(null)
    return run()
      .then((result) => {
        after?.()
        invalidate()
        return result
      })
      .catch((cause) => {
        setError(apiErrorMessage(t, 'university', 'caseDetail', cause))
        throw cause
      })
  }

  const beginReview = useMutation({ mutationFn: () => command(() => universityApi.beginReview(universityId, caseId!)) })
  const approve = useMutation({ mutationFn: () => command(() => universityApi.approveCase(universityId, caseId!)) })
  const requestEvidence = useMutation({
    mutationFn: () => command(() => universityApi.requestMoreEvidence(universityId, caseId!, notes), () => setNotes('')),
  })
  const reject = useMutation({
    mutationFn: () => command(() => universityApi.rejectCase(universityId, caseId!, notes), () => setNotes('')),
    onSettled: () => setConfirming(null),
  })
  const revoke = useMutation({
    mutationFn: () => command(() => universityApi.revokeCase(universityId, caseId!, revokeNotes), () => setRevokeNotes('')),
    onSettled: () => setConfirming(null),
  })
  const consumeChallenge = useMutation({
    mutationFn: () => command(() => universityApi.consumeChallenge(universityId, caseId!, challengeCode), () => setChallengeCode('')),
  })
  const escalate = useMutation({
    mutationFn: () =>
      command(() => universityApi.escalateCase(universityId, caseId!, escalationNotes), () => {
        setEscalating(false)
        setEscalationNotes('')
      }),
  })
  const downloadEvidence = useMutation({
    mutationFn: () => command(() => universityApi.downloadCaseEvidence(universityId, caseId!)).then((blob) => saveBlob(blob, 'verification-evidence')),
  })

  if (caseQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonPanel rows={6} />
      </PageContainer>
    )
  }

  const verificationCase = caseQuery.data
  if (caseQuery.isError || !verificationCase) {
    return (
      <PageContainer>
        <ErrorState
          title={t('common:status.error')}
          description={t('university:caseDetail.notFound')}
          onRetry={() => void caseQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      </PageContainer>
    )
  }

  const status = verificationCase.status
  const isReviewable = status === 'SUBMITTED' || status === 'UNDER_REVIEW'
  const canRevoke = status === 'VERIFIED' && role === 'UNIVERSITY_ADMIN'
  const anyPending = beginReview.isPending || approve.isPending || requestEvidence.isPending || reject.isPending || escalate.isPending
  const departmentName = departmentsQuery.data?.find((department) => department.id === verificationCase.departmentId)?.name
  const studentName = verificationCase.studentFullName ?? verificationCase.studentEmail ?? t('university:caseDetail.case')
  const notProvided = t('common:status.notProvided')

  return (
    <PageContainer className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('university:verificationQueue.title'), to: '/university/verification-cases' },
          { label: studentName },
        ]}
      />

      <PageHeader
        eyebrow={t('university:caseDetail.eyebrow')}
        title={studentName}
        description={verificationCase.studentFullName ? verificationCase.studentEmail ?? undefined : undefined}
        actions={
          <StatusBadge tone={toneOf(ENROLLMENT_VERIFICATION_TONE, status)}>{t(`university:students.statusValues.${status}`)}</StatusBadge>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/*
        Desktop: claim + evidence on the left, the decision column on the right spanning both rows.
        Phone (DOM order): claim, decision, evidence — the action is never under a whole document.
      */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Panel title={t('university:caseDetail.claimTitle')} className="lg:col-start-1 lg:row-start-1">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label={t('university:students.department')}>{departmentName ?? notProvided}</Field>
            <Field label={t('university:students.studentNumber')}>{verificationCase.studentNumber ?? notProvided}</Field>
            <Field label={t('university:students.program')}>{verificationCase.program ?? notProvided}</Field>
            <Field label={t('student:enrollment.academicYearLabel')}>{verificationCase.academicYear ?? notProvided}</Field>
          </dl>
        </Panel>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label={t('university:caseDetail.decisionTitle')}>
          <Panel title={t('university:caseDetail.statusTitle')}>
            <dl className="flex flex-col gap-3">
              <Field label={t('university:caseDetail.statusLabel')}>
                <StatusBadge tone={toneOf(ENROLLMENT_VERIFICATION_TONE, status)}>{t(`university:students.statusValues.${status}`)}</StatusBadge>
              </Field>
              <Field label={t('university:caseDetail.submittedAt')}>
                {verificationCase.submittedAt ? formatDateTime(verificationCase.submittedAt) : notProvided}
              </Field>
              {verificationCase.reviewedAt && <Field label={t('university:caseDetail.reviewedAt')}>{formatDateTime(verificationCase.reviewedAt)}</Field>}
            </dl>
            {verificationCase.reviewNotes && (
              <div className="mt-4 rounded-md bg-surface-muted p-3">
                <p className="text-caption font-semibold text-foreground-secondary">{t('university:caseDetail.lastNote')}</p>
                <p className="mt-1 whitespace-pre-line break-words text-body text-foreground">{verificationCase.reviewNotes}</p>
              </div>
            )}
            {/* Escalation is not a status, so it is announced here rather than in the badge. */}
            {verificationCase.escalatedAt && (
              <Alert tone="info" className="mt-4" title={t('university:caseDetail.escalatedTitle')}>
                {t('university:caseDetail.escalatedOn', { date: formatDateTime(verificationCase.escalatedAt) })}
                {verificationCase.escalationReason ? ` — ${verificationCase.escalationReason}` : ''}
              </Alert>
            )}
            {status === 'VERIFIED' && (
              <div className="mt-4 flex justify-center">
                <AnimatedCheck label={t('student:enrollment.verifiedTitle')} />
              </div>
            )}
          </Panel>

          {isReviewable && (
            <Panel title={t('university:caseDetail.decisionTitle')} description={t('university:caseDetail.decisionHint')}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button loading={approve.isPending} disabled={anyPending} onClick={() => approve.mutate()}>
                    {t('university:caseDetail.verify')}
                  </Button>
                  {status === 'SUBMITTED' && (
                    <Button variant="outline" loading={beginReview.isPending} disabled={anyPending} onClick={() => beginReview.mutate()}>
                      {t('university:caseDetail.beginReview')}
                    </Button>
                  )}
                </div>

                <FormField label={t('university:caseDetail.notesLabel')} htmlFor="case-notes" hint={t('university:caseDetail.notesHint')}>
                  <Textarea id="case-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" loading={requestEvidence.isPending} disabled={!notes.trim() || anyPending} onClick={() => requestEvidence.mutate()}>
                    {t('university:caseDetail.requestMoreEvidence')}
                  </Button>
                  <Button variant="danger" disabled={!notes.trim() || anyPending} onClick={() => setConfirming('reject')}>
                    {t('university:caseDetail.reject')}
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {isReviewable && (
            <Panel title={t('university:caseDetail.consumeChallengeTitle')} description={t('university:caseDetail.consumeChallengeBody')}>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label={t('university:caseDetail.codeLabel')}
                  value={challengeCode}
                  onChange={(event) => setChallengeCode(event.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-32"
                />
                <Button variant="outline" loading={consumeChallenge.isPending} disabled={challengeCode.length !== 6} onClick={() => consumeChallenge.mutate()}>
                  {t('university:caseDetail.confirmCode')}
                </Button>
              </div>
              {consumeChallenge.isSuccess && (
                <p className="mt-2 text-body text-success" role="status">
                  {t('university:caseDetail.codeConfirmed')}
                </p>
              )}
            </Panel>
          )}

          {isReviewable && (
            // The way out when this university cannot settle the case itself.
            <Panel title={t('university:caseDetail.escalateTitle')} description={t('university:caseDetail.escalateBody')}>
              <Button
                variant="outline"
                size="sm"
                disabled={anyPending || verificationCase.escalatedAt !== null}
                onClick={() => {
                  setEscalationNotes('')
                  setEscalating(true)
                }}
              >
                {verificationCase.escalatedAt ? t('university:caseDetail.alreadyEscalated') : t('university:caseDetail.escalate')}
              </Button>
            </Panel>
          )}

          {canRevoke && (
            <Panel title={t('university:caseDetail.revoke')} description={t('university:caseDetail.revokeHint')}>
              <div className="flex flex-col gap-3">
                <FormField label={t('university:caseDetail.revokeReasonLabel')} htmlFor="revoke-notes">
                  <Textarea id="revoke-notes" rows={3} value={revokeNotes} onChange={(event) => setRevokeNotes(event.target.value)} />
                </FormField>
                <Button variant="danger" className="self-start" disabled={!revokeNotes.trim() || revoke.isPending} onClick={() => setConfirming('revoke')}>
                  {t('university:caseDetail.revoke')}
                </Button>
              </div>
            </Panel>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          <Panel title={t('university:caseDetail.evidenceTitle')}>
            {verificationCase.hasEvidence ? (
              <div className="flex flex-col gap-3">
                <PrivateDocumentPreview load={() => universityApi.downloadCaseEvidence(universityId, caseId!)} />
                <p className="text-body text-foreground-secondary">{t('university:caseDetail.evidenceBody')}</p>
                <Button variant="outline" size="sm" className="self-start" loading={downloadEvidence.isPending} onClick={() => downloadEvidence.mutate()}>
                  {t('university:caseDetail.openEvidence')}
                </Button>
              </div>
            ) : (
              <p className="text-body text-foreground-secondary">{t('university:caseDetail.noEvidence')}</p>
            )}
          </Panel>
          <ProfessionalProfileSummary profile={verificationCase.professional} />
        </div>
      </div>

      <ConfirmationDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        destructive
        loading={reject.isPending || revoke.isPending}
        title={t(confirming === 'revoke' ? 'university:caseDetail.confirmRevoke.title' : 'university:caseDetail.confirmReject.title')}
        description={t(confirming === 'revoke' ? 'university:caseDetail.confirmRevoke.body' : 'university:caseDetail.confirmReject.body')}
        confirmLabel={t(confirming === 'revoke' ? 'university:caseDetail.revoke' : 'university:caseDetail.reject')}
        cancelLabel={t('university:caseDetail.confirmKeep')}
        onConfirm={() => (confirming === 'revoke' ? revoke.mutate() : reject.mutate())}
      />

      <Modal
        open={escalating}
        onClose={() => setEscalating(false)}
        closeLabel={t('common:actions.close')}
        title={t('university:caseDetail.escalateTitle')}
        description={t('university:caseDetail.escalateConfirm')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEscalating(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button loading={escalate.isPending} disabled={!escalationNotes.trim()} onClick={() => escalate.mutate()}>
              {t('university:caseDetail.escalate')}
            </Button>
          </>
        }
      >
        <FormField label={t('university:caseDetail.escalationReasonLabel')} htmlFor="escalation-notes" hint={t('university:caseDetail.escalationReasonHint')}>
          <Textarea id="escalation-notes" rows={3} maxLength={2000} value={escalationNotes} onChange={(event) => setEscalationNotes(event.target.value)} />
        </FormField>
      </Modal>
    </PageContainer>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption font-semibold text-foreground-secondary">{label}</dt>
      <dd className="mt-1 break-words text-body text-foreground">{children}</dd>
    </div>
  )
}
