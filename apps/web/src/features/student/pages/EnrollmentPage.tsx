import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as studentApi from '../api/studentApi'
import * as documentsApi from '../api/documentsApi'
import { PrivateDocumentUpload } from '../components/PrivateDocumentUpload'
import * as universityApi from '../../university/api/universityApi'
import type { StudentEnrollmentResponse } from '../types'
import { enrollmentSchema, type EnrollmentFormValues } from '../schemas/enrollmentSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { ApiError } from '../../../lib/api/client'
import { AnimatedCheck, Button, FormField, Input, LoadingSpinner, PageHeader, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'

const STATUS_TONE: Record<string, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

export function EnrollmentPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

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
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!enrollmentQuery.data || enrollmentNotFound || editing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <ClaimForm
          existing={enrollmentQuery.data}
          onDone={() => {
            setEditing(false)
            invalidate()
          }}
          onCancelEdit={enrollmentQuery.data ? () => setEditing(false) : undefined}
        />
      </div>
    )
  }

  const enrollment = enrollmentQuery.data
  const tone = STATUS_TONE[enrollment.verificationStatus] ?? 'neutral'
  const canEdit = enrollment.verificationStatus === 'DRAFT' || enrollment.verificationStatus === 'NEEDS_MORE_EVIDENCE'

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <PageHeader title={t('student:enrollment.title')} />

      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground-secondary">{t('student:enrollment.statusLabel')}</span>
          <StatusBadge tone={tone}>{t(`student:enrollment.status.${enrollment.verificationStatus}`)}</StatusBadge>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
          <Row label={t('student:enrollment.studentNumberLabel')} value={enrollment.studentNumber} />
          <Row label={t('student:enrollment.programLabel')} value={enrollment.program} />
          <Row label={t('student:enrollment.academicYearLabel')} value={enrollment.academicYear} />
        </dl>

        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 text-sm font-medium text-brand-primary hover:underline"
          >
            {t('student:enrollment.editDetails')}
          </button>
        )}
      </div>

      {/*
        Phase 7 evidence. Offered from the moment a case exists and while it is still open, since
        "more evidence needed" is the commonest reason a case stalls. The document is private:
        readable only by the student, a scoped reviewer at their own university, and a platform
        verification officer — never by any organization user (CLAUDE.md sections 31, 60).
      */}
      {caseQuery.data && !['VERIFIED', 'REJECTED', 'REVOKED'].includes(enrollment.verificationStatus) && (
        <div className="mt-6">
          <PrivateDocumentUpload
            title={t('student:evidence.title')}
            description={t('student:evidence.description')}
            present={caseQuery.data.hasEvidence}
            accept="application/pdf,image/jpeg,image/png"
            errorPage="evidence"
            invalidateKeys={[['student', 'verification-case']]}
            onUpload={documentsApi.uploadMyEvidence}
            onDownload={documentsApi.downloadMyEvidence}
            downloadFilename="verification-evidence"
          />
        </div>
      )}

      {enrollment.verificationStatus === 'DRAFT' && (
        <div className="mt-6">
          {submitMutation.isError && (
            <p className="mb-2 text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'student', 'enrollment', submitMutation.error)}
            </p>
          )}
          <Button loading={submitMutation.isPending} onClick={() => submitMutation.mutate()} className="w-full sm:w-auto">
            {t('student:enrollment.submitForVerification')}
          </Button>
        </div>
      )}

      {enrollment.verificationStatus === 'NEEDS_MORE_EVIDENCE' && (
        <div className="mt-6 rounded-lg border border-warning bg-warning-bg p-4">
          <p className="text-sm font-medium text-foreground">{t('student:enrollment.needsMoreEvidenceTitle')}</p>
          {caseQuery.data?.reviewNotes && <p className="mt-1 text-sm text-foreground-secondary">{caseQuery.data.reviewNotes}</p>}
          <Button
            variant="outline"
            loading={submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
            className="mt-4"
          >
            {t('student:enrollment.resubmit')}
          </Button>
        </div>
      )}

      {(enrollment.verificationStatus === 'SUBMITTED' || enrollment.verificationStatus === 'UNDER_REVIEW') && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-foreground-secondary">{t('student:enrollment.pendingReviewBody')}</p>
          <p className="mt-3 text-sm font-medium text-foreground">{t('student:enrollment.challengeTitle')}</p>
          <p className="text-sm text-foreground-secondary">{t('student:enrollment.challengeBody')}</p>

          {challengeMutation.data ? (
            <div className="mt-3 rounded-md bg-surface-muted p-4 text-center">
              <p className="text-2xl font-semibold tracking-widest text-foreground">{challengeMutation.data.code}</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t('student:enrollment.challengeExpires', { time: new Date(challengeMutation.data.expiresAt).toLocaleTimeString() })}
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              loading={challengeMutation.isPending}
              onClick={() => challengeMutation.mutate()}
              className="mt-3"
            >
              {t('student:enrollment.generateCode')}
            </Button>
          )}
        </div>
      )}

      {enrollment.verificationStatus === 'VERIFIED' && (
        <div className="mt-8 flex justify-center">
          <AnimatedCheck label={t('student:enrollment.verifiedTitle')} />
        </div>
      )}

      {(enrollment.verificationStatus === 'REJECTED' || enrollment.verificationStatus === 'REVOKED') && (
        <div className="mt-6 rounded-lg border border-danger bg-danger-bg p-4">
          <p className="text-sm font-medium text-foreground">
            {t(`student:enrollment.${enrollment.verificationStatus === 'REJECTED' ? 'rejectedTitle' : 'revokedTitle'}`)}
          </p>
          {caseQuery.data?.reviewNotes && <p className="mt-1 text-sm text-foreground-secondary">{caseQuery.data.reviewNotes}</p>}
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

  return (
    <div>
      <PageHeader
        title={t(existing ? 'student:enrollment.editTitle' : 'student:enrollment.claimTitle')}
        description={t('student:enrollment.claimSubtitle')}
      />

      <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField label={t('student:enrollment.universityLabel')} htmlFor="universityId">
          <Select id="universityId" {...form.register('universityId')}>
            <option value="">{t('student:enrollment.selectPlaceholder')}</option>
            {universitiesQuery.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('student:enrollment.departmentLabel')} htmlFor="departmentId">
          <Select id="departmentId" disabled={!selectedUniversityId} {...form.register('departmentId')}>
            <option value="">{t('student:enrollment.selectPlaceholder')}</option>
            {departmentsQuery.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('student:enrollment.studentNumberLabel')} htmlFor="studentNumber">
          <Input id="studentNumber" {...form.register('studentNumber')} />
        </FormField>

        <FormField label={t('student:enrollment.programLabel')} htmlFor="program">
          <Input id="program" {...form.register('program')} />
        </FormField>

        <FormField label={t('student:enrollment.academicYearLabel')} htmlFor="academicYear">
          <Input id="academicYear" placeholder="2025/2026" {...form.register('academicYear')} />
        </FormField>

        {mutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'student', 'enrollment', mutation.error)}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          <Button type="submit" loading={mutation.isPending}>
            {t(existing ? 'student:enrollment.saveChanges' : 'student:enrollment.claimSubmit')}
          </Button>
          {onCancelEdit && (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              {t('student:enrollment.cancel')}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
