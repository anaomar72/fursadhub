import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AnimatedCheck, Button, FormField, Input, LoadingSpinner, PageHeader, StatusBadge, Textarea } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'

const STATUS_TONE: Record<string, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

export function VerificationCaseDetailPage() {
  const { t } = useTranslation()
  const { caseId } = useParams<{ caseId: string }>()
  const { universityId, role } = useUniversityMembership()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [challengeCode, setChallengeCode] = useState('')

  const caseQuery = useQuery({
    queryKey: ['university', 'verification-case', caseId],
    queryFn: () => universityApi.getVerificationCase(universityId, caseId!),
    enabled: !!caseId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['university', 'verification-case', caseId] })

  const beginReviewMutation = useMutation({ mutationFn: () => universityApi.beginReview(universityId, caseId!), onSuccess: invalidate })
  const requestEvidenceMutation = useMutation({
    mutationFn: () => universityApi.requestMoreEvidence(universityId, caseId!, notes),
    onSuccess: () => {
      setNotes('')
      invalidate()
    },
  })
  const approveMutation = useMutation({ mutationFn: () => universityApi.approveCase(universityId, caseId!), onSuccess: invalidate })
  const rejectMutation = useMutation({
    mutationFn: () => universityApi.rejectCase(universityId, caseId!, notes),
    onSuccess: () => {
      setNotes('')
      invalidate()
    },
  })
  const revokeMutation = useMutation({
    mutationFn: () => universityApi.revokeCase(universityId, caseId!, notes),
    onSuccess: () => {
      setNotes('')
      invalidate()
    },
  })
  const consumeChallengeMutation = useMutation({
    mutationFn: () => universityApi.consumeChallenge(universityId, caseId!, challengeCode),
    onSuccess: () => setChallengeCode(''),
  })

  if (caseQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const verificationCase = caseQuery.data
  if (!verificationCase) {
    return null
  }

  const status = verificationCase.status
  const isReviewable = status === 'SUBMITTED' || status === 'UNDER_REVIEW'
  const anyActionPending =
    beginReviewMutation.isPending || requestEvidenceMutation.isPending || approveMutation.isPending || rejectMutation.isPending

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title={verificationCase.studentEmail ?? ''} />
        <StatusBadge tone={STATUS_TONE[status] ?? 'neutral'}>{t(`university:students.statusValues.${status}`)}</StatusBadge>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 text-sm">
        <Row label={t('university:students.studentNumber')} value={verificationCase.studentNumber ?? ''} />
        <Row label={t('university:students.program')} value={verificationCase.program ?? ''} />
        <Row label={t('student:enrollment.academicYearLabel')} value={verificationCase.academicYear ?? ''} />
      </dl>

      {verificationCase.reviewNotes && (
        <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-medium uppercase text-foreground-secondary">{t('university:caseDetail.notesLabel')}</p>
          <p className="mt-1 text-sm text-foreground">{verificationCase.reviewNotes}</p>
        </div>
      )}

      {status === 'VERIFIED' && (
        <div className="mt-8 flex justify-center">
          <AnimatedCheck label={t('student:enrollment.verifiedTitle')} />
        </div>
      )}

      {isReviewable && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium text-foreground">{t('university:caseDetail.consumeChallengeTitle')}</p>
            <p className="text-sm text-foreground-secondary">{t('university:caseDetail.consumeChallengeBody')}</p>
            <div className="mt-3 flex gap-2">
              <Input
                value={challengeCode}
                onChange={(e) => setChallengeCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-32"
              />
              <Button
                variant="outline"
                loading={consumeChallengeMutation.isPending}
                disabled={challengeCode.length !== 6}
                onClick={() => consumeChallengeMutation.mutate()}
              >
                {t('university:caseDetail.confirmCode')}
              </Button>
            </div>
            {consumeChallengeMutation.isError && (
              <p className="mt-2 text-sm text-danger" role="alert">
                {apiErrorMessage(t, 'university', 'caseDetail', consumeChallengeMutation.error)}
              </p>
            )}
            {consumeChallengeMutation.isSuccess && <p className="mt-2 text-sm text-success">{t('university:caseDetail.codeConfirmed')}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {status === 'SUBMITTED' && (
              <Button variant="outline" loading={beginReviewMutation.isPending} onClick={() => beginReviewMutation.mutate()}>
                {t('university:caseDetail.beginReview')}
              </Button>
            )}
            <Button loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
              {t('university:caseDetail.verify')}
            </Button>
          </div>

          <FormField label={t('university:caseDetail.notesLabel')} htmlFor="notes">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              loading={requestEvidenceMutation.isPending}
              disabled={!notes.trim() || anyActionPending}
              onClick={() => requestEvidenceMutation.mutate()}
            >
              {t('university:caseDetail.requestMoreEvidence')}
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              disabled={!notes.trim() || anyActionPending}
              onClick={() => rejectMutation.mutate()}
            >
              {t('university:caseDetail.reject')}
            </Button>
          </div>

          {(requestEvidenceMutation.isError || rejectMutation.isError || approveMutation.isError || beginReviewMutation.isError) && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(
                t,
                'university',
                'caseDetail',
                requestEvidenceMutation.error ?? rejectMutation.error ?? approveMutation.error ?? beginReviewMutation.error,
              )}
            </p>
          )}
        </div>
      )}

      {status === 'VERIFIED' && role === 'UNIVERSITY_ADMIN' && (
        <div className="mt-6 rounded-lg border border-danger p-4">
          <FormField label={t('university:caseDetail.revokeReasonLabel')} htmlFor="revoke-notes">
            <Textarea id="revoke-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <Button
            variant="danger"
            className="mt-3"
            loading={revokeMutation.isPending}
            disabled={!notes.trim()}
            onClick={() => revokeMutation.mutate()}
          >
            {t('university:caseDetail.revoke')}
          </Button>
          {revokeMutation.isError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'university', 'caseDetail', revokeMutation.error)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
