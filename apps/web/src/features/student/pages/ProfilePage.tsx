import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as studentApi from '../api/studentApi'
import type { StudentProfileResponse } from '../types'
import * as universityApi from '../../university/api/universityApi'
import { StudentProfilePhoto } from '../components/StudentProfilePhoto'
import { ProfessionalProfileSummary } from '../components/ProfessionalProfileSummary'
import { ENROLLMENT_VERIFICATION_TONE, toneOf } from '../../../lib/status/statusTones'
import { profileSchema, type ProfileFormValues } from '../schemas/profileSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { ApiError } from '../../../lib/api/client'
import { Alert, Button, Card, FormField, Input, PageHeader, SkeletonPanel, StatusBadge, TagInput, Textarea, FormSection } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * Professional fields belong to the student profile. Email and verified academic records
 * remain in their canonical account/enrollment flows; CVs belong to individual applications.
 */
export function StudentProfilePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['student', 'profile'],
    queryFn: studentApi.getMyProfile,
    retry: false,
  })

  const enrollmentQuery = useQuery({
    queryKey: ['student', 'enrollment'],
    queryFn: studentApi.getMyEnrollment,
    retry: false,
  })

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '', headline: '', summary: '', city: '', countryCode: '', skills: [], linkedinUrl: '', githubUrl: '', portfolioUrl: '' },
  })
  const universityId = enrollmentQuery.data?.universityId
  const universityQuery = useQuery({ queryKey: ['public-university', universityId], queryFn: () => universityApi.getPublicUniversity(universityId!), enabled: !!universityId })
  const departmentsQuery = useQuery({ queryKey: ['university', universityId, 'departments'], queryFn: () => universityApi.listDepartments(universityId!), enabled: !!universityId })

  useEffect(() => {
    if (profileQuery.data && !form.formState.isDirty) {
      form.reset(toFormValues(profileQuery.data))
    }
  }, [profileQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: studentApi.saveMyProfile,
    onSuccess: (data) => {
      form.reset(toFormValues(data))
      queryClient.setQueryData(['student', 'profile'], data)
    },
  })

  const notFound = profileQuery.error instanceof ApiError && profileQuery.error.body.status === 404
  const enrollment = enrollmentQuery.data ?? null

  if (profileQuery.isLoading) {
    return (
      <PageContainer width="narrow">
        <SkeletonPanel rows={5} />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="flex max-w-5xl flex-col gap-6">
      <PageHeader title={t('student:profile.title')} description={t('student:profile.subtitle')} />
      <Card padding="lg"><StudentProfilePhoto name={profileQuery.data?.fullName ?? ''} /></Card>
      <ProfessionalProfileSummary profile={profileQuery.data?.professional} />

      {/* Phase 9: one form surface with FormSection groups — the same structure as the organization and
          university profiles — instead of bordered sub-cards inside a card. */}
      <Card padding="lg">
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={form.handleSubmit(({ fullName, phone, ...professional }) => saveMutation.mutate({
            fullName, phone, professional: { ...professional, skills: professional.skills ?? [], countryCode: professional.countryCode || null },
          }))}
        >
          <fieldset disabled={saveMutation.isPending} className="contents">
          <div>
          <FormSection layout="stacked" title={t('student:profile.detailsTitle')}>
          <FormField
            label={t('student:profile.fullNameLabel')}
            htmlFor="fullName"
            error={form.formState.errors.fullName && t(form.formState.errors.fullName.message ?? '')}
          >
            <Input id="fullName" autoComplete="name" maxLength={255} invalid={!!form.formState.errors.fullName} {...form.register('fullName')} />
          </FormField>

          <FormField label={t('student:profile.phoneLabel')} htmlFor="phone">
            <Input id="phone" type="tel" autoComplete="tel" {...form.register('phone')} />
          </FormField>
          </FormSection>

          <FormSection layout="stacked" title={t('common:professional.about')}>
            <FormField htmlFor="headline" label={t('common:professional.headline')}><Input id="headline" maxLength={160} {...form.register('headline')} /></FormField>
            <FormField htmlFor="city" label={t('common:professional.city')}><Input id="city" autoComplete="address-level2" maxLength={120} {...form.register('city')} /></FormField>
            <FormField htmlFor="countryCode" label={t('common:professional.countryCode')} hint={t('common:professional.countryHint')} error={form.formState.errors.countryCode && t('common:professional.countryError')}><Input id="countryCode" autoComplete="country" maxLength={2} {...form.register('countryCode', { setValueAs: (value: string) => value.toUpperCase() })} /></FormField>
            <FormField htmlFor="summary" label={t('common:professional.summary')}><Textarea id="summary" rows={5} maxLength={3000} {...form.register('summary')} /></FormField>
          </FormSection>
          <FormSection layout="stacked" title={t('common:professional.skills')}>
            <FormField htmlFor="skills" label={t('common:professional.skills')} hint={t('common:professional.skillsHint')}>
              <Controller control={form.control} name="skills" render={({ field }) => <TagInput id="skills" value={field.value ?? []} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} maxTags={25} maxLength={60} aria-describedby="skills-hint" />} />
            </FormField>
          </FormSection>
          <FormSection layout="stacked" title={t('common:professional.links')}>
            {(['linkedinUrl', 'githubUrl', 'portfolioUrl'] as const).map((key) => <FormField key={key} htmlFor={key} label={t(`common:professional.${key}`)} error={form.formState.errors[key] && t('common:professional.urlError')}><Input id={key} type="url" maxLength={500} {...form.register(key)} /></FormField>)}
          </FormSection>
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'student', 'profile', saveMutation.error)}
            </p>
          )}
          {saveMutation.isSuccess && <Alert tone="success">{t('student:profile.saved')}</Alert>}
          {notFound && !profileQuery.data && <Alert tone="info">{t('student:profile.createHint')}</Alert>}

          <div>
            <Button type="submit" loading={saveMutation.isPending}>
              {t('student:profile.submit')}
            </Button>
          </div>
          </fieldset>
        </form>
      </Card>

      {/* Enrollment is the university's record, not a profile field — linked, never edited here. */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-title-panel text-foreground">
              {t('student:enrollment.title')}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">{t('student:profile.enrollmentHint')}</p>
          </div>
          {enrollment && (
            <StatusBadge tone={toneOf(ENROLLMENT_VERIFICATION_TONE, enrollment.verificationStatus)}>
              {t(`student:enrollment.status.${enrollment.verificationStatus}`)}
            </StatusBadge>
          )}
        </div>
        {enrollment && <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {universityQuery.data && <div><dt className="text-muted">{t('common:professional.university')}</dt><dd className="font-semibold">{universityQuery.data.name}</dd></div>}
          {departmentsQuery.data?.find((department) => department.id === enrollment.departmentId) && <div><dt className="text-muted">{t('common:professional.department')}</dt><dd className="font-semibold">{departmentsQuery.data.find((department) => department.id === enrollment.departmentId)?.name}</dd></div>}
          <div><dt className="text-muted">{t('student:enrollment.programLabel')}</dt><dd className="font-semibold">{enrollment.program}</dd></div>
          <div><dt className="text-muted">{t('student:enrollment.academicYearLabel')}</dt><dd className="font-semibold">{enrollment.academicYear}</dd></div>
        </dl>}
        <Link to="/student/enrollment" className="mt-4 inline-block text-sm font-semibold text-link hover:underline">
          {enrollment ? t('student:profile.manageEnrollment') : t('student:profile.claimEnrollment')}
        </Link>
      </Card>
    </PageContainer>
  )
}

function toFormValues(profile: StudentProfileResponse): ProfileFormValues {
  const professional = profile.professional
  return { fullName: profile.fullName, phone: profile.phone ?? '', headline: professional?.headline ?? '',
    summary: professional?.summary ?? '', city: professional?.city ?? '', countryCode: professional?.countryCode ?? '',
    skills: professional?.skills ?? [], linkedinUrl: professional?.linkedinUrl ?? '', githubUrl: professional?.githubUrl ?? '', portfolioUrl: professional?.portfolioUrl ?? '' }
}
