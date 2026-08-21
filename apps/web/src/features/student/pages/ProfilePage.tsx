import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as studentApi from '../api/studentApi'
import { profileSchema, type ProfileFormValues } from '../schemas/profileSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { ApiError } from '../../../lib/api/client'
import { Button, FormField, Input, LoadingSpinner } from '../../../components/ui'

export function StudentProfilePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['student', 'profile'],
    queryFn: studentApi.getMyProfile,
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

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('student:profile.title')}</h1>
      <p className="mt-1 text-sm text-foreground-secondary">{t('student:profile.subtitle')}</p>

      <form
        className="mt-6 flex flex-col gap-4"
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
          <Input id="phone" type="tel" {...form.register('phone')} />
        </FormField>

        {saveMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'student', 'profile', saveMutation.error)}
          </p>
        )}
        {saveMutation.isSuccess && <p className="text-sm text-success">{t('student:profile.saved')}</p>}
        {notFound && !profileQuery.data && (
          <p className="text-sm text-foreground-secondary">{t('student:profile.createHint')}</p>
        )}

        <Button type="submit" loading={saveMutation.isPending} className="mt-2 w-full sm:w-auto">
          {t('student:profile.submit')}
        </Button>
      </form>
    </div>
  )
}
