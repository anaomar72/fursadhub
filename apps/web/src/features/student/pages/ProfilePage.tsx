import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as studentApi from '../api/studentApi'
import * as documentsApi from '../api/documentsApi'
import { PrivateDocumentUpload } from '../components/PrivateDocumentUpload'
import { profileSchema, type ProfileFormValues } from '../schemas/profileSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { ApiError } from '../../../lib/api/client'
import { Alert, Button, Card, FormField, Input, LoadingState, PageHeader, StatusBadge } from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * The student's own profile and private documents.
 *
 * <p>Only the two fields `PUT /students/me/profile` actually accepts are editable — full name and
 * phone. Email lives on the account, and university/department/student number live on the
 * enrollment, which the university verifies; both are linked to rather than duplicated here as
 * fields the student cannot really change from this screen.
 */
export function StudentProfilePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['student', 'profile'],
    queryFn: studentApi.getMyProfile,
    retry: false,
  })

  // Metadata only — whether a CV exists. The bytes come from the download route.
  const cvQuery = useQuery({
    queryKey: ['student', 'cv'],
    queryFn: documentsApi.getMyCv,
    retry: false,
  })

  const enrollmentQuery = useQuery({
    queryKey: ['student', 'enrollment'],
    queryFn: studentApi.getMyEnrollment,
    retry: false,
  })

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '' },
  })

  useEffect(() => {
    if (profileQuery.data) {
      form.reset({ fullName: profileQuery.data.fullName, phone: profileQuery.data.phone ?? '' })
    }
  }, [profileQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: studentApi.saveMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['student', 'profile'], data)
    },
  })

  const notFound = profileQuery.error instanceof ApiError && profileQuery.error.body.status === 404
  const enrollment = enrollmentQuery.data ?? null

  if (profileQuery.isLoading) {
    return (
      <PageContainer width="narrow">
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer width="narrow" className="flex flex-col gap-6">
      <PageHeader title={t('student:profile.title')} description={t('student:profile.subtitle')} />

      <Card padding="lg">
        <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
          {t('student:profile.detailsTitle')}
        </h2>

        <form
          className="mt-4 flex flex-col gap-4"
          noValidate
          onSubmit={form.handleSubmit((values) => saveMutation.mutate({ fullName: values.fullName, phone: values.phone }))}
        >
          <FormField
            label={t('student:profile.fullNameLabel')}
            htmlFor="fullName"
            error={form.formState.errors.fullName && t(form.formState.errors.fullName.message ?? '')}
          >
            <Input id="fullName" invalid={!!form.formState.errors.fullName} {...form.register('fullName')} />
          </FormField>

          <FormField label={t('student:profile.phoneLabel')} htmlFor="phone">
            <Input id="phone" type="tel" autoComplete="tel" {...form.register('phone')} />
          </FormField>

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
        </form>
      </Card>

      {/*
        Phase 7. The CV is private: it is never given a URL, and the only people who can read it are
        the student and recruiters at organizations where they have a candidacy — reached through
        that candidacy, never through the student (CLAUDE.md section 47).
      */}
      <PrivateDocumentUpload
        title={t('student:cv.title')}
        description={t('student:cv.description')}
        present={cvQuery.data?.present ?? false}
        accept="application/pdf"
        errorPage="cv"
        invalidateKeys={[['student', 'cv']]}
        onUpload={documentsApi.uploadMyCv}
        onDownload={documentsApi.downloadMyCv}
        onRemove={documentsApi.removeMyCv}
        downloadFilename="cv.pdf"
      />

      {/* Enrollment is the university's record, not a profile field — linked, never edited here. */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
              {t('student:enrollment.title')}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">{t('student:profile.enrollmentHint')}</p>
          </div>
          {enrollment && (
            <StatusBadge tone={enrollment.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>
              {t(`student:enrollment.status.${enrollment.verificationStatus}`)}
            </StatusBadge>
          )}
        </div>
        <Link to="/student/enrollment" className="mt-4 inline-block text-sm font-semibold text-link hover:underline">
          {enrollment ? t('student:profile.manageEnrollment') : t('student:profile.claimEnrollment')}
        </Link>
      </Card>
    </PageContainer>
  )
}
