import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { organizationCapabilities } from '../organizationCapabilities'
import { updateOrganizationSchema, type UpdateOrganizationFormValues } from '../schemas/organizationProfileSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Alert,
  AnimatedCheck,
  Avatar,
  Badge,
  Button,
  Card,
  FileUpload,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  StatusBadge,
  Textarea,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import type { StatusTone } from '../../../components/ui'
import type { InstitutionVerificationStatus } from '../types'
import { formatDate } from '../../../lib/utils/formatDate'

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

/**
 * The organization's own record, and its institution-verification state (CLAUDE.md section 31).
 *
 * <p>Editing, the logo, the evidence document and submitting for verification are all
 * {@code ORGANIZATION_ADMIN} only ({@code UpdateOrganizationService}, {@code OrganizationLogoService},
 * {@code OrganizationVerificationEvidenceService}). Other roles get the read view rather than
 * disabled controls — a form you cannot submit is worse than no form.
 *
 * <p>Only fields the API actually persists are shown. `type` is on the record but has no update
 * path ({@code UpdateOrganizationRequest} does not carry it), so it is displayed and not offered as
 * an editable control: a control that silently cannot save is the one thing this page must not have.
 */
export function ProfilePage() {
  const { t } = useTranslation()
  const membership = useOrganizationMembership()
  const { organizationId } = membership
  const can = organizationCapabilities(membership)
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

  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const evidenceMutation = useMutation({
    mutationFn: (file: File) => {
      setEvidenceError(null)
      return organizationApi.uploadOrganizationEvidence(organizationId, file).catch((cause) => {
        setEvidenceError(apiErrorMessage(t, 'organization', 'profile', cause))
        throw cause
      })
    },
    onSuccess: invalidate,
  })

  const [logoError, setLogoError] = useState<string | null>(null)
  const logoMutation = useMutation({
    mutationFn: (file: File) => {
      setLogoError(null)
      return organizationApi.uploadOrganizationLogo(organizationId, file).catch((cause) => {
        setLogoError(apiErrorMessage(t, 'organization', 'profile', cause))
        throw cause
      })
    },
    onSuccess: invalidate,
  })

  if (organizationQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const organization = organizationQuery.data
  if (!organization) return null

  const canSubmitForVerification =
    organization.verificationStatus === 'DRAFT' || organization.verificationStatus === 'NEEDS_CHANGES'

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('organization:profile.title')}
        description={t('organization:profile.subtitle')}
        actions={
          <StatusBadge tone={STATUS_TONE[organization.verificationStatus]}>
            {t(`organization:profile.verificationStatusValues.${organization.verificationStatus}`)}
          </StatusBadge>
        }
      />

      <Card padding="lg">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            src={
              organization.hasLogo
                ? `${organizationApi.organizationLogoUrl(organizationId)}?v=${encodeURIComponent(organization.logoUploadedAt ?? '')}`
                : null
            }
            name={organization.name}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-bold text-brand-navy dark:text-foreground">
              {organization.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge>{t(`organization:typeValues.${organization.type}`)}</Badge>
              {organization.verifiedAt && (
                <span className="text-xs text-muted">
                  {t('organization:profile.verifiedOn', { date: formatDate(organization.verifiedAt) })}
                </span>
              )}
            </div>
          </div>
          {organization.verificationStatus === 'VERIFIED' && (
            <AnimatedCheck label={t('organization:profile.verifiedLabel')} />
          )}
        </div>

        {can.canEditProfile && (
          <div className="mt-5 border-t border-border pt-5">
            <FileUpload
              label={t('organization:profile.logo.label')}
              hint={t('organization:profile.logo.hint')}
              accept="image/jpeg,image/png"
              disabled={logoMutation.isPending}
              invalid={!!logoError}
              onFiles={(files) => files[0] && logoMutation.mutate(files[0])}
            />
            {logoError && (
              <p className="mt-2 text-sm text-danger" role="alert">
                {logoError}
              </p>
            )}
          </div>
        )}
      </Card>

      {can.canEditProfile ? (
        <form noValidate onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <Card padding="lg" className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
                {t('organization:profile.detailsTitle')}
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">{t('organization:profile.detailsHint')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t('organization:setup.nameLabel')}
                htmlFor="org-profile-name"
                className="sm:col-span-2"
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
            </div>

            <FormField label={t('organization:setup.descriptionLabel')} htmlFor="org-profile-description">
              <Textarea id="org-profile-description" rows={4} {...form.register('description')} />
            </FormField>

            {updateMutation.isError && (
              <Alert tone="danger">{apiErrorMessage(t, 'organization', 'profile', updateMutation.error)}</Alert>
            )}

            <div className="border-t border-border pt-4">
              <Button type="submit" loading={updateMutation.isPending}>
                {t('organization:profile.saveChanges')}
              </Button>
            </div>
          </Card>
        </form>
      ) : (
        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('organization:profile.detailsTitle')}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label={t('organization:setup.nameLabel')}>{organization.name}</Fact>
            <Fact label={t('organization:setup.websiteLabel')}>{organization.website ?? '—'}</Fact>
            {organization.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t('organization:setup.descriptionLabel')}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-foreground-secondary">
                  {organization.description}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {can.canEditProfile && canSubmitForVerification && (
        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('organization:profile.verificationTitle')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            {t('organization:profile.submitForVerificationBody')}
          </p>

          <div className="mt-5">
            <FileUpload
              label={t('organization:profile.evidence.label')}
              hint={t('organization:profile.evidence.hint')}
              accept="application/pdf"
              disabled={evidenceMutation.isPending}
              invalid={!!evidenceError}
              onFiles={(files) => files[0] && evidenceMutation.mutate(files[0])}
            />
            {evidenceMutation.isPending && (
              <p className="mt-2 text-xs text-foreground-secondary">{t('organization:profile.evidence.uploading')}</p>
            )}
            {organization.hasEvidence && !evidenceMutation.isPending && (
              <p className="mt-2 text-sm text-success">{t('organization:profile.evidence.attached')}</p>
            )}
            {evidenceError && (
              <p className="mt-2 text-sm text-danger" role="alert">
                {evidenceError}
              </p>
            )}
          </div>

          {submitMutation.isError && (
            <Alert tone="danger" className="mt-4">
              {apiErrorMessage(t, 'organization', 'profile', submitMutation.error)}
            </Alert>
          )}

          <div className="mt-5 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              loading={submitMutation.isPending}
              disabled={!organization.hasEvidence}
              onClick={() => submitMutation.mutate()}
            >
              {t('organization:profile.submitForVerification')}
            </Button>
            {!organization.hasEvidence && (
              <p className="mt-2 text-xs text-foreground-secondary">{t('organization:profile.evidence.required')}</p>
            )}
          </div>
        </Card>
      )}
    </PageContainer>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{children}</dd>
    </div>
  )
}
