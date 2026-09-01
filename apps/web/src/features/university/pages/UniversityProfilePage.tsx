import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { updateUniversitySchema, type UpdateUniversityFormValues } from '../schemas/universitySetupSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AnimatedCheck, Avatar, Button, FormField, Input, LoadingSpinner, PageHeader, StatusBadge, Textarea } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import type { InstitutionVerificationStatus } from '../types'

const STATUS_TONE: Record<InstitutionVerificationStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_CHANGES: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  REVOKED: 'danger',
}

/** University profile + institution verification state (CLAUDE.md section 31), the counterpart of
 * organization/pages/ProfilePage.tsx. Editing and submitting are restricted to UNIVERSITY_ADMIN. */
export function UniversityProfilePage() {
  const { t } = useTranslation()
  const { universityId, role } = useUniversityMembership()
  const isAdmin = role === 'UNIVERSITY_ADMIN'
  const queryClient = useQueryClient()

  const universityQuery = useQuery({
    queryKey: ['university', 'detail', universityId],
    queryFn: () => universityApi.getUniversityDetail(universityId),
  })

  const form = useForm<UpdateUniversityFormValues>({
    resolver: zodResolver(updateUniversitySchema),
    defaultValues: { name: '', city: '', registrationNumber: '', website: '', description: '' },
  })

  useEffect(() => {
    if (universityQuery.data) {
      form.reset({
        name: universityQuery.data.name,
        city: universityQuery.data.city ?? '',
        registrationNumber: universityQuery.data.registrationNumber ?? '',
        website: universityQuery.data.website ?? '',
        description: universityQuery.data.description ?? '',
      })
    }
  }, [universityQuery.data, form])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['university', 'detail', universityId] })

  const updateMutation = useMutation({
    mutationFn: (values: UpdateUniversityFormValues) => universityApi.updateUniversity(universityId, values),
    onSuccess: invalidate,
  })

  const submitMutation = useMutation({
    mutationFn: () => universityApi.submitUniversityForVerification(universityId),
    onSuccess: invalidate,
  })

  const [evidenceFileError, setEvidenceFileError] = useState<string | null>(null)
  const evidenceInputRef = useRef<HTMLInputElement>(null)
  const evidenceMutation = useMutation({
    mutationFn: (file: File) => {
      setEvidenceFileError(null)
      return universityApi.uploadUniversityEvidence(universityId, file).catch((cause) => {
        setEvidenceFileError(apiErrorMessage(t, 'university', 'profile', cause))
        throw cause
      })
    },
    onSuccess: () => {
      invalidate()
      if (evidenceInputRef.current) evidenceInputRef.current.value = ''
    },
  })

  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const logoMutation = useMutation({
    mutationFn: (file: File) => {
      setLogoError(null)
      return universityApi.uploadUniversityLogo(universityId, file).catch((cause) => {
        setLogoError(apiErrorMessage(t, 'university', 'profile', cause))
        throw cause
      })
    },
    onSuccess: () => {
      invalidate()
      if (logoInputRef.current) logoInputRef.current.value = ''
    },
  })

  if (universityQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const university = universityQuery.data
  if (!university) {
    return null
  }

  const canSubmitForVerification = university.status === 'DRAFT' || university.status === 'NEEDS_CHANGES'

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t('university:profile.title')} />
        <StatusBadge tone={STATUS_TONE[university.status]}>
          {t(`university:profile.verificationStatusValues.${university.status}`)}
        </StatusBadge>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Avatar
          src={
            university.hasLogo
              ? `${universityApi.universityLogoUrl(universityId)}?v=${encodeURIComponent(university.logoUploadedAt ?? '')}`
              : null
          }
          name={university.name}
          size="lg"
        />
        {isAdmin && (
          <div className="flex flex-col gap-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="text-sm text-foreground-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-on-brand"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) logoMutation.mutate(file)
              }}
              disabled={logoMutation.isPending}
            />
            <p className="text-xs text-foreground-secondary">{t('university:profile.logo.hint')}</p>
            {logoError && (
              <p className="text-sm text-danger" role="alert">
                {logoError}
              </p>
            )}
          </div>
        )}
      </div>

      {university.status === 'VERIFIED' && (
        <div className="mt-6 flex justify-center">
          <AnimatedCheck label={t('university:profile.verifiedLabel')} />
        </div>
      )}

      {isAdmin ? (
        <form
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
          noValidate
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <FormField
            label={t('university:setup.nameLabel')}
            htmlFor="uni-profile-name"
            error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
          >
            <Input id="uni-profile-name" {...form.register('name')} />
          </FormField>
          <FormField label={t('university:setup.cityLabel')} htmlFor="uni-profile-city">
            <Input id="uni-profile-city" {...form.register('city')} />
          </FormField>
          <FormField label={t('university:setup.registrationNumberLabel')} htmlFor="uni-profile-registration">
            <Input id="uni-profile-registration" {...form.register('registrationNumber')} />
          </FormField>
          <FormField label={t('university:setup.websiteLabel')} htmlFor="uni-profile-website">
            <Input id="uni-profile-website" type="url" {...form.register('website')} />
          </FormField>
          <FormField label={t('university:setup.descriptionLabel')} htmlFor="uni-profile-description">
            <Textarea id="uni-profile-description" {...form.register('description')} />
          </FormField>

          {updateMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'university', 'profile', updateMutation.error)}
            </p>
          )}

          <Button type="submit" loading={updateMutation.isPending} className="w-full sm:w-auto">
            {t('university:profile.saveChanges')}
          </Button>

          {canSubmitForVerification && (
            <div className="mt-2 border-t border-border pt-4">
              <p className="text-sm text-foreground-secondary">{t('university:profile.submitForVerificationBody')}</p>

              <div className="mt-3 flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{t('university:profile.evidence.label')}</p>
                <p className="text-xs text-foreground-secondary">{t('university:profile.evidence.hint')}</p>
                {university.hasEvidence && (
                  <p className="text-xs text-success">{t('university:profile.evidence.attached')}</p>
                )}
                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept="application/pdf"
                  className="text-sm text-foreground-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-on-brand"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) evidenceMutation.mutate(file)
                  }}
                  disabled={evidenceMutation.isPending}
                />
                {evidenceMutation.isPending && (
                  <p className="text-xs text-foreground-secondary">{t('university:profile.evidence.uploading')}</p>
                )}
                {evidenceFileError && (
                  <p className="text-sm text-danger" role="alert">
                    {evidenceFileError}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4"
                loading={submitMutation.isPending}
                disabled={!university.hasEvidence}
                onClick={() => submitMutation.mutate()}
              >
                {t('university:profile.submitForVerification')}
              </Button>
              {!university.hasEvidence && (
                <p className="mt-2 text-xs text-foreground-secondary">{t('university:profile.evidence.required')}</p>
              )}
              {submitMutation.isError && (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {apiErrorMessage(t, 'university', 'profile', submitMutation.error)}
                </p>
              )}
            </div>
          )}
        </form>
      ) : (
        <dl className="mt-6 grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 text-sm">
          <Row label={t('university:setup.nameLabel')} value={university.name} />
          <Row label={t('university:setup.cityLabel')} value={university.city ?? ''} />
        </dl>
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
