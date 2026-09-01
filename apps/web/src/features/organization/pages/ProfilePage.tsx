import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { updateOrganizationSchema, type UpdateOrganizationFormValues } from '../schemas/organizationProfileSchema'
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

/** Organization profile + institution verification state (CLAUDE.md section 31). Editing and
 * submitting for verification are restricted to ORGANIZATION_ADMIN; other roles see a read view. */
export function ProfilePage() {
  const { t } = useTranslation()
  const { organizationId, role } = useOrganizationMembership()
  const isAdmin = role === 'ORGANIZATION_ADMIN'
  const queryClient = useQueryClient()

  const organizationQuery = useQuery({
    queryKey: ['organization', 'detail', organizationId],
    queryFn: () => organizationApi.getOrganization(organizationId),
  })

  const form = useForm<UpdateOrganizationFormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: '', registrationNumber: '', website: '', description: '' },
  })

  useEffect(() => {
    if (organizationQuery.data) {
      form.reset({
        name: organizationQuery.data.name,
        registrationNumber: organizationQuery.data.registrationNumber ?? '',
        website: organizationQuery.data.website ?? '',
        description: organizationQuery.data.description ?? '',
      })
    }
  }, [organizationQuery.data, form])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['organization', 'detail', organizationId] })

  const updateMutation = useMutation({
    mutationFn: (values: UpdateOrganizationFormValues) => organizationApi.updateOrganization(organizationId, values),
    onSuccess: invalidate,
  })

  const submitMutation = useMutation({
    mutationFn: () => organizationApi.submitOrganizationForVerification(organizationId),
    onSuccess: invalidate,
  })

  const [evidenceFileError, setEvidenceFileError] = useState<string | null>(null)
  const evidenceInputRef = useRef<HTMLInputElement>(null)
  const evidenceMutation = useMutation({
    mutationFn: (file: File) => {
      setEvidenceFileError(null)
      return organizationApi.uploadOrganizationEvidence(organizationId, file).catch((cause) => {
        setEvidenceFileError(apiErrorMessage(t, 'organization', 'profile', cause))
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
      return organizationApi.uploadOrganizationLogo(organizationId, file).catch((cause) => {
        setLogoError(apiErrorMessage(t, 'organization', 'profile', cause))
        throw cause
      })
    },
    onSuccess: () => {
      invalidate()
      if (logoInputRef.current) logoInputRef.current.value = ''
    },
  })

  if (organizationQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const organization = organizationQuery.data
  if (!organization) {
    return null
  }

  const canSubmitForVerification = organization.verificationStatus === 'DRAFT' || organization.verificationStatus === 'NEEDS_CHANGES'

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t('organization:profile.title')} />
        <StatusBadge tone={STATUS_TONE[organization.verificationStatus]}>
          {t(`organization:profile.verificationStatusValues.${organization.verificationStatus}`)}
        </StatusBadge>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Avatar
          src={
            organization.hasLogo
              ? `${organizationApi.organizationLogoUrl(organizationId)}?v=${encodeURIComponent(organization.logoUploadedAt ?? '')}`
              : null
          }
          name={organization.name}
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
            <p className="text-xs text-foreground-secondary">{t('organization:profile.logo.hint')}</p>
            {logoError && (
              <p className="text-sm text-danger" role="alert">
                {logoError}
              </p>
            )}
          </div>
        )}
      </div>

      {organization.verificationStatus === 'VERIFIED' && (
        <div className="mt-6 flex justify-center">
          <AnimatedCheck label={t('organization:profile.verifiedLabel')} />
        </div>
      )}

      {isAdmin ? (
        <form
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
          noValidate
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <FormField
            label={t('organization:setup.nameLabel')}
            htmlFor="org-profile-name"
            error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
          >
            <Input id="org-profile-name" {...form.register('name')} />
          </FormField>
          <FormField label={t('organization:setup.registrationNumberLabel')} htmlFor="org-profile-registration">
            <Input id="org-profile-registration" {...form.register('registrationNumber')} />
          </FormField>
          <FormField label={t('organization:setup.websiteLabel')} htmlFor="org-profile-website">
            <Input id="org-profile-website" type="url" {...form.register('website')} />
          </FormField>
          <FormField label={t('organization:setup.descriptionLabel')} htmlFor="org-profile-description">
            <Textarea id="org-profile-description" {...form.register('description')} />
          </FormField>

          {updateMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'organization', 'profile', updateMutation.error)}
            </p>
          )}

          <Button type="submit" loading={updateMutation.isPending} className="w-full sm:w-auto">
            {t('organization:profile.saveChanges')}
          </Button>

          {canSubmitForVerification && (
            <div className="mt-2 border-t border-border pt-4">
              <p className="text-sm text-foreground-secondary">{t('organization:profile.submitForVerificationBody')}</p>

              <div className="mt-3 flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{t('organization:profile.evidence.label')}</p>
                <p className="text-xs text-foreground-secondary">{t('organization:profile.evidence.hint')}</p>
                {organization.hasEvidence && (
                  <p className="text-xs text-success">{t('organization:profile.evidence.attached')}</p>
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
                {evidenceMutation.isPending && <p className="text-xs text-foreground-secondary">{t('organization:profile.evidence.uploading')}</p>}
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
                disabled={!organization.hasEvidence}
                onClick={() => submitMutation.mutate()}
              >
                {t('organization:profile.submitForVerification')}
              </Button>
              {!organization.hasEvidence && (
                <p className="mt-2 text-xs text-foreground-secondary">{t('organization:profile.evidence.required')}</p>
              )}
              {submitMutation.isError && (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {apiErrorMessage(t, 'organization', 'profile', submitMutation.error)}
                </p>
              )}
            </div>
          )}
        </form>
      ) : (
        <dl className="mt-6 grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 text-sm">
          <Row label={t('organization:setup.nameLabel')} value={organization.name} />
          <Row label={t('organization:setup.websiteLabel')} value={organization.website ?? ''} />
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
