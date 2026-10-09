import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { updateUniversitySchema, type UpdateUniversityFormValues } from '../schemas/universitySetupSchema'
import { buildUniversityProfilePayload, toUniversityFormValues } from '../universityProfilePayload'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Alert,
  VerifiedBadge,
  Avatar,
  Button,
  Card,
  FileUpload,
  FormField,
  Input,
  FormSection,
  SkeletonPanel,
  PageHeader,
  ProfileBanner,
  Textarea,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { InstitutionVerificationPanel } from '../../../components/verification/InstitutionVerificationPanel'

/**
 * The university's own record and its institution-verification state (CLAUDE.md section 31) — the
 * counterpart of organization/pages/ProfilePage.tsx, and now sharing its layout and its
 * design-system controls rather than raw file inputs.
 *
 * <p>Editing, the logo, the cover, the evidence document and submitting for verification are all
 * `UNIVERSITY_ADMIN` only (`UpdateUniversityService`, `UniversityLogoService`,
 * `UniversityCoverService`). A coordinator or supervisor who reaches this URL gets the read view
 * rather than a form whose every save would be refused.
 *
 * <p>Only fields the API actually persists are shown. Backend Phase B2 added `countryCode` and
 * `publicContactEmail`; industry, size and founded year are organization concepts and B2
 * deliberately did not mirror them here, so no control invents them.
 */
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
    defaultValues: {
      name: '',
      city: '',
      registrationNumber: '',
      website: '',
      description: '',
      countryCode: '',
      publicContactEmail: '',
    },
  })

  useEffect(() => {
    if (universityQuery.data) {
      form.reset(toUniversityFormValues(universityQuery.data))
    }
  }, [universityQuery.data, form])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['university', 'detail', universityId] })

  const updateMutation = useMutation({
    // The stored record is passed alongside the form values because `countryCode` and
    // `publicContactEmail` are presence-aware: the builder omits an untouched field rather than
    // serializing it as null, which would erase it.
    mutationFn: (values: UpdateUniversityFormValues) =>
      universityApi.updateUniversity(universityId, buildUniversityProfilePayload(values, universityQuery.data!)),
    onSuccess: invalidate,
  })

  const submitMutation = useMutation({
    mutationFn: () => universityApi.submitUniversityForVerification(universityId),
    onSuccess: invalidate,
  })

  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  // The name of the file just uploaded, so the upload zone can say exactly what is on file.
  const [lastEvidenceName, setLastEvidenceName] = useState<string | null>(null)
  const evidenceMutation = useMutation({
    mutationFn: (file: File) => {
      setEvidenceError(null)
      return universityApi.uploadUniversityEvidence(universityId, file).catch((cause) => {
        setEvidenceError(apiErrorMessage(t, 'university', 'profile', cause))
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
      return universityApi.uploadUniversityLogo(universityId, file).catch((cause) => {
        setLogoError(apiErrorMessage(t, 'university', 'profile', cause))
        throw cause
      })
    },
    onSuccess: invalidate,
  })

  const [coverError, setCoverError] = useState<string | null>(null)
  const coverMutation = useMutation({
    mutationFn: (file: File) => {
      setCoverError(null)
      return universityApi.uploadUniversityCover(universityId, file).catch((cause) => {
        setCoverError(apiErrorMessage(t, 'university', 'profile', cause))
        throw cause
      })
    },
    onSuccess: invalidate,
  })

  if (universityQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonPanel rows={6} />
      </PageContainer>
    )
  }

  const university = universityQuery.data
  if (!university) return null

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('university:profile.title')}
        description={t('university:profile.subtitle')}
        actions={<>
          {university.status === 'VERIFIED' && <Link to={`/universities/${university.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-link">{t('common:remediation.viewPublicProfile')}</Link>}
        </>}
      />

      {/* Directly under the heading: the one step that unlocks the institution, with its status,
          meaning, progress, upload and next steps in one place. */}
      <InstitutionVerificationPanel
        namespace="university"
        status={university.status}
        hasEvidence={!!university.hasEvidence}
        canManage={isAdmin}
        upload={{ onFile: (file) => evidenceMutation.mutate(file), pending: evidenceMutation.isPending, error: evidenceError, lastFileName: lastEvidenceName }}
        submit={{
          onSubmit: () => submitMutation.mutate(),
          pending: submitMutation.isPending,
          error: submitMutation.isError ? apiErrorMessage(t, 'university', 'profile', submitMutation.error) : null,
        }}
      />

      {/* Backend Phase B2 cover. `hasCover` is a flag, never a file id (CLAUDE.md section 47); the
          bytes come from the public route, and the upload timestamp busts the browser cache so a
          replacement is visible immediately. */}
      <ProfileBanner
        coverUrl={
          university.hasCover
            ? `${universityApi.universityCoverUrl(universityId)}?v=${encodeURIComponent(university.coverUploadedAt ?? '')}`
            : undefined
        }
      />

      <Card padding="lg">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            src={
              university.hasLogo
                ? `${universityApi.universityLogoUrl(universityId)}?v=${encodeURIComponent(university.logoUploadedAt ?? '')}`
                : null
            }
            name={university.name}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-display text-title-section text-foreground">
              {university.name}
            </h2>
            {(university.city || university.countryCode) && (
              <p className="mt-1 truncate text-sm text-foreground-secondary">
                {[university.city, university.countryCode].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          {university.status === 'VERIFIED' && <VerifiedBadge variant="label" />}
        </div>

        {isAdmin && (
          <div className="mt-5 grid gap-5 border-t border-border pt-5 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="font-display font-bold">{t('common:remediation.media')}</h2><p className="mt-1 text-xs text-muted">{t('common:remediation.mediaHint')}</p></div>
            <div>
              <FileUpload
                label={t('university:profile.logo.label')}
                hint={t('university:profile.logo.hint')}
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
                label={t('university:profile.cover.label')}
                hint={t('university:profile.cover.hint')}
                accept="image/jpeg,image/png"
                disabled={coverMutation.isPending}
                invalid={!!coverError}
                onFiles={(files) => files[0] && coverMutation.mutate(files[0])}
              />
              <p className="mt-2 text-xs text-foreground-secondary">
                {university.hasCover
                  ? t('university:profile.cover.replaceHint')
                  : t('university:profile.cover.emptyHint')}
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

      {isAdmin ? (
        <form noValidate onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <div className="grid gap-5">
            <FormSection title={t('common:remediation.basic')} description={t('common:remediation.basicHint')}><FormField
              label={t('university:setup.nameLabel')}
              htmlFor="uni-profile-name"
              className="sm:col-span-2"
              error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
            >
              <Input id="uni-profile-name" {...form.register('name')} />
            </FormField>
              <FormField
                label={t('university:setup.registrationNumberLabel')}
                optional
                htmlFor="uni-profile-registration"
                hint={t('university:setup.registrationNumberHint')}
              >
                <Input id="uni-profile-registration" {...form.register('registrationNumber')} />
              </FormField></FormSection>

            <FormSection title={t('common:remediation.publicProfile')} description={t('common:remediation.publicHint')}><FormField
              label={t('university:setup.cityLabel')}
              htmlFor="uni-profile-city"
              error={form.formState.errors.city && t(form.formState.errors.city.message ?? '')}
            >
              <Input id="uni-profile-city" {...form.register('city')} />
            </FormField>
              <FormField
                label={t('university:profile.countryLabel')}
                htmlFor="uni-profile-country"
                hint={t('university:profile.countryHint')}
                error={form.formState.errors.countryCode && t(form.formState.errors.countryCode.message ?? '')}
              >
                <Input id="uni-profile-country" maxLength={2} {...form.register('countryCode')} />
              </FormField>
              <FormField label={t('university:setup.descriptionLabel')} htmlFor="uni-profile-description">
                <Textarea id="uni-profile-description" rows={4} {...form.register('description')} />
              </FormField></FormSection>

            <FormSection title={t('common:remediation.web')} description={t('common:remediation.webHint')}><FormField
              label={t('university:setup.websiteLabel')}
              htmlFor="uni-profile-website"
              error={form.formState.errors.website && t(form.formState.errors.website.message ?? '')}
            >
              <Input id="uni-profile-website" type="url" {...form.register('website')} />
            </FormField>
              <FormField
                label={t('university:profile.publicContactEmailLabel')}
                htmlFor="uni-profile-contact-email"
                className="sm:col-span-2"
                hint={t('university:profile.publicContactEmailHint')}
                error={
                  form.formState.errors.publicContactEmail && t(form.formState.errors.publicContactEmail.message ?? '')
                }
              >
                <Input id="uni-profile-contact-email" type="email" {...form.register('publicContactEmail')} />
              </FormField></FormSection>
            <div className="sticky bottom-0 z-20 rounded-xl border border-border bg-surface p-4">{updateMutation.isError && (
              <Alert tone="danger">{apiErrorMessage(t, 'university', 'profile', updateMutation.error)}</Alert>
            )}
              {/* As on the organization profile: the failure was reported, the success was not. */}
              {updateMutation.isSuccess && <Alert tone="success">{t('university:profile.saved')}</Alert>}

              <div className="border-t border-border pt-4">
                <Button type="submit" loading={updateMutation.isPending}>
                  {t('university:profile.saveChanges')}
                </Button>
              </div>
            </div></div></form>
      ) : (
        <Card padding="lg">
          <h2 className="font-display text-title-panel text-foreground">
            {t('university:profile.detailsTitle')}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label={t('university:setup.nameLabel')}>{university.name}</Fact>
            <Fact label={t('university:setup.cityLabel')}>
              {[university.city, university.countryCode].filter(Boolean).join(', ') || '—'}
            </Fact>
            <Fact label={t('university:profile.publicContactEmailLabel')}>
              {university.publicContactEmail ?? '—'}
            </Fact>
            <Fact label={t('university:setup.websiteLabel')}>{university.website ?? '—'}</Fact>
            {university.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t('university:setup.descriptionLabel')}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-foreground-secondary">
                  {university.description}
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
