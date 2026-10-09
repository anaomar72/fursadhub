import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as studentApi from '../api/studentApi'
import * as documentsApi from '../api/documentsApi'
import { PrivateDocumentUpload } from '../components/PrivateDocumentUpload'
import { VerifiedEnrollment } from '../components/VerifiedEnrollment'
import * as universityApi from '../../university/api/universityApi'
import type { StudentEnrollmentResponse } from '../types'
import { enrollmentSchema, type EnrollmentFormValues } from '../schemas/enrollmentSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { ApiError } from '../../../lib/api/client'
import { PageContainer } from '../../../app/layouts/PageContainer'
import {
  Alert,
  Button,
  FormField,
  Icon,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  SkeletonRegion,
  SkeletonText,
  StatusBadge,
  Stepper,
} from '../../../components/ui'
import { formatTime } from '../../../lib/utils/formatDate'
import { ENROLLMENT_VERIFICATION_TONE, toneOf } from '../../../lib/status/statusTones'

/**
 * The five real stages of enrollment verification (CLAUDE.md sections 27-30): the student claims
 * their enrollment, provides their student ID, submits, their university reviews, and the
 * enrollment is verified. `NEEDS_MORE_EVIDENCE` sends the student back to the ID step.
 */
function useEnrollmentSteps() {
  const { t } = useTranslation()
  return (['details', 'evidence', 'submit', 'review', 'verified'] as const).map((key) => ({
    label: t(`student:enrollment.steps.${key}`),
  }))
}

function stepFor(enrollment: StudentEnrollmentResponse | undefined): number {
  if (!enrollment) return 0
  switch (enrollment.verificationStatus) {
    case 'DRAFT':
      return enrollment.hasDraftEvidence ? 2 : 1
    case 'NEEDS_MORE_EVIDENCE':
      return 1
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 3
    default:
      return 0
  }
}

/**
 * The student's university affiliation and its verification.
 *
 * <p>Every state answers four questions: what the status is, what it means, what the student can do
 * now, and what happens next. The workflow itself is unchanged — claim, upload, submit, and the
 * in-person code while the university reviews — and nothing here promises a review time or implies
 * the review is automatic: it is done by the university's own staff.
 */
export function EnrollmentPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const steps = useEnrollmentSteps()

  const enrollmentQuery = useQuery({
    queryKey: ['student', 'enrollment'],
    queryFn: studentApi.getMyEnrollment,
    retry: false,
  })

  const enrollmentNotFound =
    enrollmentQuery.error instanceof ApiError && enrollmentQuery.error.body.code === 'STUDENT_ENROLLMENT_NOT_FOUND'

  const caseQuery = useQuery({
    queryKey: ['student', 'verification-case'],
    queryFn: studentApi.getMyCase,
    retry: false,
    enabled: !!enrollmentQuery.data && enrollmentQuery.data.verificationStatus !== 'DRAFT',
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['student', 'enrollment'] })
    queryClient.invalidateQueries({ queryKey: ['student', 'verification-case'] })
  }

  const submitMutation = useMutation({
    mutationFn: studentApi.submitVerification,
    onSuccess: invalidate,
  })

  const challengeMutation = useMutation({ mutationFn: studentApi.issueChallenge })

  if (enrollmentQuery.isLoading) {
    return (
      <PageContainer width="narrow">
        <SkeletonRegion className="flex flex-col gap-6">
          <Skeleton className="h-8 w-64 max-w-full" />
          <SkeletonText lines={2} />
          <Skeleton className="h-40 w-full rounded-lg" />
        </SkeletonRegion>
      </PageContainer>
    )
  }

  if (!enrollmentQuery.data || enrollmentNotFound || editing) {
    return (
      <PageContainer width="narrow">
        <ClaimForm
          existing={enrollmentQuery.data}
          onDone={() => {
            setEditing(false)
            invalidate()
          }}
          onCancelEdit={enrollmentQuery.data ? () => setEditing(false) : undefined}
        />
      </PageContainer>
    )
  }

  const enrollment = enrollmentQuery.data
  const status = enrollment.verificationStatus
  const tone = toneOf(ENROLLMENT_VERIFICATION_TONE, status)
  const canEdit = status === 'DRAFT' || status === 'NEEDS_MORE_EVIDENCE'
  const pending = status === 'SUBMITTED' || status === 'UNDER_REVIEW'
  const closed = status === 'REJECTED' || status === 'REVOKED'

  /*
   * A verified enrollment is a finished thing, so it gets a finished screen rather than the
   * submission layout with a tick bolted on. Returning early is what guarantees none of the
   * upload/submit/resubmit affordances below can reach a student who has nothing left to do.
   */
  if (status === 'VERIFIED') {
    return (
      <PageContainer width="narrow">
        <PageHeader title={t('student:enrollment.title')} />
        <div className="mt-6">
          <VerifiedEnrollment enrollment={enrollment} />
        </div>
      </PageContainer>
    )
  }

  const meaning = pending
    ? t('student:enrollment.pendingReviewBody')
    : t(`student:enrollment.statusMeaning.${status}`, { defaultValue: '' })

  return (
    <PageContainer width="narrow" className="flex flex-col gap-6">
      <PageHeader title={t('student:enrollment.title')} />

      {!closed && (
        <Stepper
          orientation="horizontal"
          label={t('student:enrollment.progressLabel')}
          steps={steps}
          currentStep={stepFor(enrollment)}
          attention={status === 'NEEDS_MORE_EVIDENCE'}
        />
      )}

      {/* ------------------------------------------------------------ status: what it is, what it means */}
      <Panel
        title={t('student:enrollment.statusLabel')}
        action={<StatusBadge tone={tone}>{t(`student:enrollment.status.${status}`)}</StatusBadge>}
        footer={
          canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {t('student:enrollment.editDetails')}
            </button>
          ) : undefined
        }
      >
        {meaning && <p className="text-body-lg text-foreground">{meaning}</p>}

        {(status === 'NEEDS_MORE_EVIDENCE' || closed) && caseQuery.data?.reviewNotes && (
          <div className={closed ? 'mt-4 rounded-lg border border-danger/25 bg-danger-bg p-4' : 'mt-4 rounded-lg border border-warning/25 bg-warning-bg p-4'}>
            <p className="text-label text-foreground">{t('student:enrollment.reviewerNote')}</p>
            <p className="mt-1 whitespace-pre-line text-body text-foreground-secondary">{caseQuery.data.reviewNotes}</p>
          </div>
        )}

        <dl className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
          <Fact label={t('student:enrollment.studentNumberLabel')} value={enrollment.studentNumber} />
          <Fact label={t('student:enrollment.programLabel')} value={enrollment.program} />
          <Fact label={t('student:enrollment.academicYearLabel')} value={enrollment.academicYear} />
        </dl>
      </Panel>

      {/*
        Phase 7 evidence. Offered from the moment a case exists and while it is still open, since
        "more evidence needed" is the commonest reason a case stalls. The document is private:
        readable only by the student, a scoped reviewer at their own university, and a platform
        verification officer — never by any organization user (CLAUDE.md sections 31, 60).
      */}
      {canEdit && (
        <PrivateDocumentUpload
          title={t('student:evidence.title')}
          description={t('student:evidence.description')}
          present={enrollment.hasDraftEvidence === true || caseQuery.data?.hasEvidence === true}
          accept="application/pdf,image/jpeg,image/png"
          allowPhoto
          errorPage="evidence"
          invalidateKeys={[['student', 'verification-case'], ['student', 'enrollment']]}
          onUpload={documentsApi.uploadMyEvidence}
          onDownload={documentsApi.downloadMyEvidence}
          downloadFilename="verification-evidence"
        />
      )}

      {status === 'DRAFT' && (
        <div className="flex flex-col gap-3">
          {submitMutation.isError && <Alert tone="danger">{apiErrorMessage(t, 'student', 'enrollment', submitMutation.error)}</Alert>}
          {!enrollment.hasDraftEvidence && <p className="text-body text-foreground-secondary">{t('common:remediation.studentIdRequired')}</p>}
          <Button size="lg" disabled={!enrollment.hasDraftEvidence} loading={submitMutation.isPending} onClick={() => submitMutation.mutate()} className="w-full sm:w-auto sm:self-start">
            {t('student:enrollment.submitForVerification')}
          </Button>
        </div>
      )}

      {status === 'NEEDS_MORE_EVIDENCE' && (
        <div className="flex flex-col gap-3">
          {submitMutation.isError && <Alert tone="danger">{apiErrorMessage(t, 'student', 'enrollment', submitMutation.error)}</Alert>}
          <Button size="lg" loading={submitMutation.isPending} disabled={!caseQuery.data?.hasEvidence} onClick={() => submitMutation.mutate()} className="w-full sm:w-auto sm:self-start">
            {t('student:enrollment.resubmit')}
          </Button>
        </div>
      )}

      {pending && (
        <Panel title={t('student:enrollment.challengeTitle')} headingLevel="h2">
          <p className="text-body text-foreground-secondary">{t('student:enrollment.challengeBody')}</p>
          {challengeMutation.data ? (
            <div className="mt-4 rounded-lg bg-surface-muted p-5 text-center">
              <p className="font-display text-metric tracking-[0.3em] tabular-nums text-foreground">{challengeMutation.data.code}</p>
              <p className="mt-1 text-caption text-foreground-secondary">
                {t('student:enrollment.challengeExpires', { time: formatTime(challengeMutation.data.expiresAt) })}
              </p>
            </div>
          ) : (
            <Button variant="outline" loading={challengeMutation.isPending} onClick={() => challengeMutation.mutate()} className="mt-4">
              {t('student:enrollment.generateCode')}
            </Button>
          )}
        </Panel>
      )}

      {/* No dead end: what the student can do while the university decides. Applying stays closed
          until the enrollment is verified, and the copy says so. */}
      {(pending || canEdit) && (
        <div className="flex flex-col gap-3 rounded-lg bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body text-foreground-secondary">{t('student:enrollment.whileWaiting')}</p>
          <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-2">
            <Link to="/student/profile" className="rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              {t('student:enrollment.verified.profile')}
            </Link>
            <Link to="/student/opportunities" className="rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              {t('student:enrollment.verified.browse')}
            </Link>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-foreground-secondary">{label}</dt>
      <dd className="mt-0.5 break-words text-body font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function ClaimForm({
  existing,
  onDone,
  onCancelEdit,
}: {
  existing: StudentEnrollmentResponse | undefined
  onDone: () => void
  onCancelEdit?: () => void
}) {
  const { t } = useTranslation()
  const steps = useEnrollmentSteps()

  const universitiesQuery = useQuery({ queryKey: ['universities'], queryFn: universityApi.listUniversities })

  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      universityId: existing?.universityId ?? '',
      departmentId: existing?.departmentId ?? '',
      studentNumber: existing?.studentNumber ?? '',
      program: existing?.program ?? '',
      academicYear: existing?.academicYear ?? '',
    },
  })

  const selectedUniversityId = form.watch('universityId')

  const departmentsQuery = useQuery({
    queryKey: ['departments', selectedUniversityId],
    queryFn: () => universityApi.listDepartments(selectedUniversityId),
    enabled: !!selectedUniversityId,
  })

  useEffect(() => {
    if (universitiesQuery.data?.length === 1 && !form.getValues('universityId')) {
      form.setValue('universityId', universitiesQuery.data[0].id)
    }
  }, [universitiesQuery.data, form])

  const mutation = useMutation({
    mutationFn: existing ? studentApi.updateEnrollment : studentApi.claimEnrollment,
    onSuccess: onDone,
  })

  const errors = form.formState.errors

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(existing ? 'student:enrollment.editTitle' : 'student:enrollment.claimTitle')}
        description={t('student:enrollment.claimSubtitle')}
      />

      {!existing && (
        <Stepper orientation="horizontal" label={t('student:enrollment.progressLabel')} steps={steps} currentStep={0} />
      )}

      {/* Why this exists, before the student is asked for anything. */}
      <div className="flex items-start gap-3 rounded-lg bg-surface-muted p-4">
        <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-info" />
        <div className="min-w-0">
          <p className="text-label text-foreground">{t('student:enrollment.whyTitle')}</p>
          <p className="mt-1 text-body text-foreground-secondary">{t('student:enrollment.whyBody')}</p>
        </div>
      </div>

      <form className="flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField
          label={t('student:enrollment.universityLabel')}
          htmlFor="universityId"
          required
          error={errors.universityId && t(errors.universityId.message ?? '')}
        >
          <Select id="universityId" disabled={universitiesQuery.isLoading} {...form.register('universityId')}>
            <option value="">{t('student:enrollment.selectPlaceholder')}</option>
            {universitiesQuery.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t('student:enrollment.departmentLabel')}
          htmlFor="departmentId"
          required
          error={errors.departmentId && t(errors.departmentId.message ?? '')}
        >
          <Select id="departmentId" disabled={!selectedUniversityId || departmentsQuery.isLoading} {...form.register('departmentId')}>
            <option value="">{t('student:enrollment.selectPlaceholder')}</option>
            {departmentsQuery.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t('student:enrollment.studentNumberLabel')}
          htmlFor="studentNumber"
          required
          hint={t('student:enrollment.studentNumberHint')}
          error={errors.studentNumber && t(errors.studentNumber.message ?? '')}
        >
          <Input id="studentNumber" invalid={!!errors.studentNumber} {...form.register('studentNumber')} />
        </FormField>

        <FormField
          label={t('student:enrollment.programLabel')}
          htmlFor="program"
          required
          error={errors.program && t(errors.program.message ?? '')}
        >
          <Input id="program" invalid={!!errors.program} {...form.register('program')} />
        </FormField>

        <FormField
          label={t('student:enrollment.academicYearLabel')}
          htmlFor="academicYear"
          required
          error={errors.academicYear && t(errors.academicYear.message ?? '')}
        >
          <Input id="academicYear" placeholder="2025/2026" invalid={!!errors.academicYear} {...form.register('academicYear')} />
        </FormField>

        {mutation.isError && <Alert tone="danger">{apiErrorMessage(t, 'student', 'enrollment', mutation.error)}</Alert>}

        <div className="mt-2 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
          <Button type="submit" size="lg" loading={mutation.isPending} className="w-full sm:w-auto">
            {t(existing ? 'student:enrollment.saveChanges' : 'student:enrollment.claimSubmit')}
          </Button>
          {onCancelEdit && (
            <Button type="button" variant="ghost" size="lg" onClick={onCancelEdit} className="w-full sm:w-auto">
              {t('student:enrollment.cancel')}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
