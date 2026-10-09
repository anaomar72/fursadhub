import { Link } from 'react-router-dom'
import { SocialIcon } from '../../../components/ui/SocialIcon'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { organizationCapabilities } from '../organizationCapabilities'
import {
  COMPANY_SIZE_RANGES,
  updateOrganizationSchema,
  type UpdateOrganizationFormValues,
} from '../schemas/organizationProfileSchema'
import { buildOrganizationProfilePayload, toOrganizationFormValues } from '../organizationProfilePayload'
import { InstitutionVerificationPanel } from '../../../components/verification/InstitutionVerificationPanel'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Alert,
  VerifiedBadge,
  Avatar,
  Badge,
  Button,
  Card,
  FileUpload,
  FormField,
  Input,
  FormSection,
  SkeletonPanel,
  PageHeader,
  ProfileBanner,
  Select,
  Textarea,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'

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
    defaultValues: {
      name: '',
      registrationNumber: '',
      website: '',
      description: '',
      industry: '',
      city: '',
      countryCode: '',
      shortDescription: '',
      companySizeRange: '',
      foundedYear: '',
      linkedinUrl: '',
      xUrl: '',
      instagramUrl: '',
      youtubeUrl: '',
    },
  })

  useEffect(() => {
    if (organizationQuery.data) {
      form.reset(toOrganizationFormValues(organizationQuery.data))
    }
  }, [organizationQuery.data, form])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['organization', 'detail', organizationId] })

  const updateMutation = useMutation({
    // The stored record is passed alongside the form values because the Backend Phase B2 fields are
    // presence-aware: the payload builder omits an untouched field rather than serializing it as
    // null, which would erase it.
    mutationFn: (values: UpdateOrganizationFormValues) =>
      organizationApi.updateOrganization(
        organizationId,
        buildOrganizationProfilePayload(values, organizationQuery.data!),
      ),
    onSuccess: invalidate,
  })

  const submitMutation = useMutation({
    mutationFn: () => organizationApi.submitOrganizationForVerification(organizationId),
    onSuccess: invalidate,
  })

  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  // The name of the file just uploaded, so the upload zone can say exactly what is on file.
  const [lastEvidenceName, setLastEvidenceName] = useState<string | null>(null)
  const evidenceMutation = useMutation({
    mutationFn: (file: File) => {
      setEvidenceError(null)
      return organizationApi.uploadOrganizationEvidence(organizationId, file).catch((cause) => {
        setEvidenceError(apiErrorMessage(t, 'organization', 'profile', cause))
        throw cause
      })
    },
    onSuccess: (_data, file) => {
      setLastEvidenceName(file.name)
      void invalidate()
    },
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

  const [coverError, setCoverError] = useState<string | null>(null)
  const coverMutation = useMutation({
    mutationFn: (file: File) => {
      setCoverError(null)
      return organizationApi.uploadOrganizationCover(organizationId, file).catch((cause) => {
        setCoverError(apiErrorMessage(t, 'organization', 'profile', cause))
        throw cause
      })
    },
    onSuccess: invalidate,
  })

  if (organizationQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonPanel rows={6} />
      </PageContainer>
    )
  }

  const organization = organizationQuery.data
  if (!organization) return null

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('organization:profile.title')}
        description={t('organization:profile.subtitle')}
        actions={<>
          {organization.verificationStatus === 'VERIFIED' && <Link to={`/organizations/${organization.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-link">{t('common:remediation.viewPublicProfile')}</Link>}
        </>}
      />

      {/* Directly under the heading: the one step that unlocks the institution, with its status,
          meaning, progress, upload and next steps in one place. */}
      <InstitutionVerificationPanel
        namespace="organization"
        status={organization.verificationStatus}
        hasEvidence={!!organization.hasEvidence}
        canManage={can.canEditProfile}
        upload={{ onFile: (file) => evidenceMutation.mutate(file), pending: evidenceMutation.isPending, error: evidenceError, lastFileName: lastEvidenceName }}
        submit={{
          onSubmit: () => submitMutation.mutate(),
          pending: submitMutation.isPending,
          error: submitMutation.isError ? apiErrorMessage(t, 'organization', 'profile', submitMutation.error) : null,
        }}
      />

      {/* Backend Phase B2 cover. hasCover is a flag, never a file id (CLAUDE.md section 47); the
          bytes come from the public route, and the upload timestamp busts the browser cache after a
          replacement so the admin sees what they just uploaded. */}
      <ProfileBanner
        coverUrl={
          organization.hasCover
            ? `${organizationApi.organizationCoverUrl(organizationId)}?v=${encodeURIComponent(organization.coverUploadedAt ?? '')}`
            : undefined
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
            <h2 className="break-words font-display text-title-section text-foreground">
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
            <VerifiedBadge variant="label" />
          )}
        </div>

        {can.canEditProfile && (
          <div className="mt-5 grid gap-5 border-t border-border pt-5 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="font-display font-bold">{t('common:remediation.media')}</h2><p className="mt-1 text-xs text-muted">{t('common:remediation.mediaHint')}</p></div>
            <div>
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

            <div>
              <FileUpload
                label={t('organization:profile.cover.label')}
                hint={t('organization:profile.cover.hint')}
                accept="image/jpeg,image/png"
                disabled={coverMutation.isPending}
                invalid={!!coverError}
                onFiles={(files) => files[0] && coverMutation.mutate(files[0])}
              />
              <p className="mt-2 text-xs text-foreground-secondary">
                {organization.hasCover
                  ? t('organization:profile.cover.replaceHint')
                  : t('organization:profile.cover.emptyHint')}
              </p>
              {coverError && (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {coverError}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {can.canEditProfile ? (
        <form noValidate onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <div className="grid gap-5">
            <FormSection title={t('common:remediation.basic')} description={t('common:remediation.basicHint')}><FormField
              label={t('organization:setup.nameLabel')}
              htmlFor="org-profile-name"
              className="sm:col-span-2"
              error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
            >
              <Input id="org-profile-name" {...form.register('name')} />
            </FormField>
              <FormField
                label={t('organization:profile.industryLabel')}
                htmlFor="org-profile-industry"
                error={form.formState.errors.industry && t(form.formState.errors.industry.message ?? '')}
              >
                <Input id="org-profile-industry" {...form.register('industry')} />
              </FormField>
              <FormField
                label={t('organization:profile.companySizeLabel')}
                htmlFor="org-profile-size"
                hint={t('organization:profile.companySizeHint')}
              >
                <Select id="org-profile-size" {...form.register('companySizeRange')}>
                  <option value="">{t('organization:profile.notStated')}</option>
                  {COMPANY_SIZE_RANGES.map((range) => (
                    <option key={range} value={range}>
                      {t(`organization:profile.companySizeValues.${range}`)}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label={t('organization:profile.foundedYearLabel')}
                htmlFor="org-profile-founded"
                error={form.formState.errors.foundedYear && t('organization:profile.errors.invalidYear')}
              >
                <Controller
                  control={form.control}
                  name="foundedYear"
                  render={({ field }) => (
                    <Input
                      id="org-profile-founded"
                      ref={field.ref}
                      aria-invalid={!!form.formState.errors.foundedYear}
                      aria-describedby={form.formState.errors.foundedYear ? 'org-profile-founded-error' : undefined}
                      type="number"
                      inputMode="numeric"
                      min={1800}
                      max={2200}
                      value={field.value === '' ? '' : String(field.value)}
                      onBlur={field.onBlur}
                      // '' must survive as '': Number('') is 0, which would publish a founding year
                      // of the year zero for an organization that simply cleared the field.
                      onChange={(event) => field.onChange(event.target.value === '' ? '' : Number(event.target.value))}
                    />
                  )}
                />
              </FormField>
              <FormField
                label={t('organization:setup.registrationNumberLabel')}
                optional
                htmlFor="org-profile-registration"
                hint={t('organization:setup.registrationNumberHint')}
              >
                <Input id="org-profile-registration" {...form.register('registrationNumber')} />
              </FormField></FormSection>

            <FormSection title={t('common:remediation.publicProfile')} description={t('common:remediation.publicHint')}><FormField
              label={t('organization:profile.shortDescriptionLabel')}
              htmlFor="org-profile-short-description"
              className="sm:col-span-2"
              hint={t('organization:profile.shortDescriptionHint')}
              error={form.formState.errors.shortDescription && t(form.formState.errors.shortDescription.message ?? '')}
            >
              <Input id="org-profile-short-description" maxLength={200} {...form.register('shortDescription')} />
            </FormField>
              <FormField
                label={t('organization:profile.cityLabel')}
                htmlFor="org-profile-city"
                error={form.formState.errors.city && t(form.formState.errors.city.message ?? '')}
              >
                <Input id="org-profile-city" {...form.register('city')} />
              </FormField>
              <FormField
                label={t('organization:profile.countryLabel')}
                htmlFor="org-profile-country"
                hint={t('organization:profile.countryHint')}
                error={form.formState.errors.countryCode && t(form.formState.errors.countryCode.message ?? '')}
              >
                <Input id="org-profile-country" maxLength={2} {...form.register('countryCode')} />
              </FormField>
              <FormField label={t('organization:setup.descriptionLabel')} htmlFor="org-profile-description">
                <Textarea id="org-profile-description" rows={4} {...form.register('description')} />
              </FormField></FormSection>

            <FormSection title={t('common:remediation.web')} description={t('common:remediation.webHint')}><FormField
              label={t('organization:setup.websiteLabel')}
              htmlFor="org-profile-website"
              error={form.formState.errors.website && t(form.formState.errors.website.message ?? '')}
            >
              <Input id="org-profile-website" type="url" {...form.register('website')} />
            </FormField>
              <FormField
                label={t('organization:profile.linkedinLabel')}
                labelIcon={<SocialIcon platform="linkedin" />}
                htmlFor="org-profile-linkedin"
                error={form.formState.errors.linkedinUrl && t(form.formState.errors.linkedinUrl.message ?? '')}
              >
                <Input id="org-profile-linkedin" type="url" {...form.register('linkedinUrl')} />
              </FormField>
              <FormField
                label={t('organization:profile.xLabel')}
                labelIcon={<SocialIcon platform="x" />}
                htmlFor="org-profile-x"
                error={form.formState.errors.xUrl && t(form.formState.errors.xUrl.message ?? '')}
              >
                <Input id="org-profile-x" type="url" {...form.register('xUrl')} />
              </FormField>
              <FormField
                label={t('organization:profile.instagramLabel')}
                labelIcon={<SocialIcon platform="instagram" />}
                htmlFor="org-profile-instagram"
                error={form.formState.errors.instagramUrl && t(form.formState.errors.instagramUrl.message ?? '')}
              >
                <Input id="org-profile-instagram" type="url" {...form.register('instagramUrl')} />
              </FormField>
              <FormField
                label={t('organization:profile.youtubeLabel')}
                labelIcon={<SocialIcon platform="youtube" />}
                htmlFor="org-profile-youtube"
                error={form.formState.errors.youtubeUrl && t(form.formState.errors.youtubeUrl.message ?? '')}
              >
                <Input id="org-profile-youtube" type="url" {...form.register('youtubeUrl')} />
              </FormField></FormSection>
            <div className="sticky bottom-0 z-20 rounded-xl border border-border bg-surface p-4">{updateMutation.isError && (
              <Alert tone="danger">{apiErrorMessage(t, 'organization', 'profile', updateMutation.error)}</Alert>
            )}
              {/* A long form that saves silently leaves the author guessing whether it took. The
                  failure was already reported here; the success was not. */}
              {updateMutation.isSuccess && <Alert tone="success">{t('organization:profile.saved')}</Alert>}

              <div className="border-t border-border pt-4">
                <Button type="submit" loading={updateMutation.isPending}>
                  {t('organization:profile.saveChanges')}
                </Button>
              </div>
            </div></div></form>
      ) : (
        <Card padding="lg">
          <h2 className="font-display text-title-panel text-foreground">
            {t('organization:profile.detailsTitle')}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label={t('organization:setup.nameLabel')}>{organization.name}</Fact>
            <Fact label={t('organization:profile.industryLabel')}>{organization.industry ?? '—'}</Fact>
            <Fact label={t('organization:profile.cityLabel')}>
              {[organization.city, organization.countryCode].filter(Boolean).join(', ') || '—'}
            </Fact>
            <Fact label={t('organization:profile.companySizeLabel')}>
              {organization.companySizeRange
                ? t(`organization:profile.companySizeValues.${organization.companySizeRange}`)
                : '—'}
            </Fact>
            <Fact label={t('organization:profile.foundedYearLabel')}>{organization.foundedYear ?? '—'}</Fact>
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
