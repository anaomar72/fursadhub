import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { saveBlob } from '../../../lib/api/privateDocument'
import {
  Alert,
  AnimatedCheck,
  Breadcrumbs,
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  Textarea,
} from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDateTime } from '../../../lib/utils/formatDate'

const STATUS_TONE: Record<string, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

/**
 * One student verification case, as its university reviews it (CLAUDE.md sections 29-30).
 *
 * <p>Phase 15 closed two holes here. The reviewer can now OPEN THE EVIDENCE they are being asked to
 * judge — {@code GET .../evidence/document} always existed and was never called, so the decision was
 * previously made blind — and can ESCALATE a case to the platform. Escalation is what fills the
 * Super Admin queue; without it, that queue could only ever be empty.
 *
 * <p>Escalation deliberately does not appear as a status: {@code UniversityVerificationController}
 * leaves the frozen state machine untouched and only changes who may act. The university keeps its
 * own access throughout, which is why the review controls stay enabled afterwards.
 *
 * <p>Every decision is a distinct command endpoint, and the badge re-renders only from the refetched
 * case — never from an optimistic guess about what a transition did.
 */
export function VerificationCaseDetailPage() {
  const { t } = useTranslation()
  const { caseId } = useParams<{ caseId: string }>()
  const { universityId, role } = useUniversityMembership()
  const queryClient = useQueryClient()

  const [notes, setNotes] = useState('')
  const [challengeCode, setChallengeCode] = useState('')
  const [escalating, setEscalating] = useState(false)
  const [escalationNotes, setEscalationNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const caseQuery = useQuery({
    queryKey: ['university', 'verification-case', caseId],
    queryFn: () => universityApi.getVerificationCase(universityId, caseId!),
    enabled: !!caseId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['university', 'verification-case', caseId] })
    void queryClient.invalidateQueries({ queryKey: ['university', 'verification-queue'] })
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

  const clearNotes = () => setNotes('')

  const beginReview = useMutation({
    mutationFn: () => command(() => universityApi.beginReview(universityId, caseId!)),
  })
  const approve = useMutation({
    mutationFn: () => command(() => universityApi.approveCase(universityId, caseId!)),
  })
  const requestEvidence = useMutation({
    mutationFn: () =>
      command(() => universityApi.requestMoreEvidence(universityId, caseId!, notes), clearNotes),
  })
  const reject = useMutation({
    mutationFn: () => command(() => universityApi.rejectCase(universityId, caseId!, notes), clearNotes),
  })
  const revoke = useMutation({
    mutationFn: () => command(() => universityApi.revokeCase(universityId, caseId!, notes), clearNotes),
  })
  const consumeChallenge = useMutation({
    mutationFn: () =>
      command(() => universityApi.consumeChallenge(universityId, caseId!, challengeCode), () =>
        setChallengeCode(''),
      ),
  })
  const escalate = useMutation({
    mutationFn: () =>
      command(() => universityApi.escalateCase(universityId, caseId!, escalationNotes), () => {
        setEscalating(false)
        setEscalationNotes('')
      }),
  })
  const downloadEvidence = useMutation({
    mutationFn: () =>
      command(() => universityApi.downloadCaseEvidence(universityId, caseId!)).then((blob) =>
        saveBlob(blob, 'verification-evidence'),
      ),
  })

  if (caseQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
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
  const anyPending =
    beginReview.isPending ||
    approve.isPending ||
    requestEvidence.isPending ||
    reject.isPending ||
    escalate.isPending

  return (
    <PageContainer className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('university:verificationQueue.title'), to: '/university/verification-cases' },
          { label: verificationCase.studentEmail ?? t('university:caseDetail.case') },
        ]}
      />

      <PageHeader
        eyebrow={t('university:caseDetail.eyebrow')}
        title={verificationCase.studentEmail ?? t('university:caseDetail.case')}
        actions={
          <StatusBadge tone={STATUS_TONE[status] ?? 'neutral'}>
            {t(`university:students.statusValues.${status}`)}
          </StatusBadge>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Escalation is not a status, so it is announced separately rather than in the badge. */}
      {verificationCase.escalatedAt && (
        <Alert tone="info" title={t('university:caseDetail.escalatedTitle')}>
          {t('university:caseDetail.escalatedOn', { date: formatDateTime(verificationCase.escalatedAt) })}
          {verificationCase.escalationReason ? ` — ${verificationCase.escalationReason}` : ''}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg" className="flex flex-col gap-4">
          <h2 className="font-semibold text-foreground">{t('university:caseDetail.claimTitle')}</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label={t('university:students.studentNumber')}>
              {verificationCase.studentNumber ?? t('common:status.notProvided')}
            </Field>
            <Field label={t('university:students.program')}>
              {verificationCase.program ?? t('common:status.notProvided')}
            </Field>
            <Field label={t('student:enrollment.academicYearLabel')}>
              {verificationCase.academicYear ?? t('common:status.notProvided')}
            </Field>
            <Field label={t('university:caseDetail.submittedAt')}>
              {verificationCase.submittedAt
                ? formatDateTime(verificationCase.submittedAt)
                : t('common:status.notProvided')}
            </Field>
          </dl>
          {verificationCase.reviewNotes && (
            <div className="rounded-lg bg-surface-muted p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t('university:caseDetail.notesLabel')}
              </p>
              <p className="mt-1 text-sm text-foreground">{verificationCase.reviewNotes}</p>
            </div>
          )}
        </Card>

        <Card padding="lg" className="flex flex-col gap-3">
          <h2 className="font-semibold text-foreground">{t('university:caseDetail.evidenceTitle')}</h2>
          {verificationCase.hasEvidence ? (
            <>
              <p className="text-sm text-foreground-secondary">
                {t('university:caseDetail.evidenceBody')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                loading={downloadEvidence.isPending}
                onClick={() => downloadEvidence.mutate()}
              >
                {t('university:caseDetail.openEvidence')}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">{t('university:caseDetail.noEvidence')}</p>
          )}
        </Card>
      </div>

      {status === 'VERIFIED' && (
        <div className="flex justify-center py-4">
          <AnimatedCheck label={t('student:enrollment.verifiedTitle')} />
        </div>
      )}

      {isReviewable && (
        <>
          <Card padding="lg" className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold text-foreground">
                {t('university:caseDetail.consumeChallengeTitle')}
              </h2>
              <p className="text-sm text-foreground-secondary">
                {t('university:caseDetail.consumeChallengeBody')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={t('university:caseDetail.confirmCode')}
                value={challengeCode}
                onChange={(event) => setChallengeCode(event.target.value)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                className="w-32"
              />
              <Button
                variant="outline"
                loading={consumeChallenge.isPending}
                disabled={challengeCode.length !== 6}
                onClick={() => consumeChallenge.mutate()}
              >
                {t('university:caseDetail.confirmCode')}
              </Button>
            </div>
            {consumeChallenge.isSuccess && (
              <p className="text-sm text-success">{t('university:caseDetail.codeConfirmed')}</p>
            )}
          </Card>

          <Card padding="lg" className="flex flex-col gap-4">
            <h2 className="font-semibold text-foreground">{t('university:caseDetail.decisionTitle')}</h2>

            <div className="flex flex-wrap gap-2">
              {status === 'SUBMITTED' && (
                <Button
                  variant="outline"
                  loading={beginReview.isPending}
                  disabled={anyPending}
                  onClick={() => beginReview.mutate()}
                >
                  {t('university:caseDetail.beginReview')}
                </Button>
              )}
              <Button loading={approve.isPending} disabled={anyPending} onClick={() => approve.mutate()}>
                {t('university:caseDetail.verify')}
              </Button>
            </div>

            <FormField
              label={t('university:caseDetail.notesLabel')}
              htmlFor="case-notes"
              hint={t('university:caseDetail.notesHint')}
            >
              <Textarea
                id="case-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                loading={requestEvidence.isPending}
                disabled={!notes.trim() || anyPending}
                onClick={() => requestEvidence.mutate()}
              >
                {t('university:caseDetail.requestMoreEvidence')}
              </Button>
              <Button
                variant="danger"
                loading={reject.isPending}
                disabled={!notes.trim() || anyPending}
                onClick={() => reject.mutate()}
              >
                {t('university:caseDetail.reject')}
              </Button>
            </div>
          </Card>

          {/* The way out when this university cannot settle the case itself. */}
          <Card padding="lg" className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold text-foreground">
                {t('university:caseDetail.escalateTitle')}
              </h2>
              <p className="text-sm text-foreground-secondary">
                {t('university:caseDetail.escalateBody')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              disabled={anyPending || verificationCase.escalatedAt !== null}
              onClick={() => {
                setEscalationNotes('')
                setEscalating(true)
              }}
            >
              {verificationCase.escalatedAt
                ? t('university:caseDetail.alreadyEscalated')
                : t('university:caseDetail.escalate')}
            </Button>
          </Card>
        </>
      )}

      {status === 'VERIFIED' && role === 'UNIVERSITY_ADMIN' && (
        <Card padding="lg" className="flex flex-col gap-3 border-danger">
          <h2 className="font-semibold text-foreground">{t('university:caseDetail.revoke')}</h2>
          <FormField label={t('university:caseDetail.revokeReasonLabel')} htmlFor="revoke-notes">
            <Textarea
              id="revoke-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </FormField>
          <Button
            variant="danger"
            className="self-start"
            loading={revoke.isPending}
            disabled={!notes.trim()}
            onClick={() => revoke.mutate()}
          >
            {t('university:caseDetail.revoke')}
          </Button>
        </Card>
      )}

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
            <Button
              loading={escalate.isPending}
              disabled={!escalationNotes.trim()}
              onClick={() => escalate.mutate()}
            >
              {t('university:caseDetail.escalate')}
            </Button>
          </>
        }
      >
        <FormField
          label={t('university:caseDetail.escalationReasonLabel')}
          htmlFor="escalation-notes"
          hint={t('university:caseDetail.escalationReasonHint')}
        >
          <Textarea
            id="escalation-notes"
            rows={3}
            maxLength={2000}
            value={escalationNotes}
            onChange={(event) => setEscalationNotes(event.target.value)}
          />
        </FormField>
      </Modal>
    </PageContainer>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{children}</dd>
    </div>
  )
}
