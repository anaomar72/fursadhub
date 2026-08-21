import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/resetPasswordSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { AnimatedCheck, Button, FormField, Input } from '../../../components/ui'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) => authApi.resetPassword({ token: token ?? '', newPassword: values.newPassword }),
  })

  if (!token) {
    return (
      <AuthCard title={t('auth:resetPassword.errors.missingToken')}>
        <Link to="/forgot-password" className="block text-center text-sm font-medium text-brand-primary hover:underline">
          {t('auth:forgotPassword.title')}
        </Link>
      </AuthCard>
    )
  }

  if (mutation.isSuccess) {
    return (
      <AuthCard title={t('auth:resetPassword.successTitle')}>
        <AnimatedCheck label={t('auth:resetPassword.successTitle')} />
        <p className="mt-4 text-center text-sm text-foreground-secondary">{t('auth:resetPassword.successBody')}</p>
        <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-primary hover:underline">
          {t('auth:resetPassword.continue')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth:resetPassword.title')}>
      <form className="flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField
          label={t('auth:resetPassword.newPasswordLabel')}
          htmlFor="newPassword"
          error={form.formState.errors.newPassword && t(form.formState.errors.newPassword.message ?? '')}
        >
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            invalid={!!form.formState.errors.newPassword}
            {...form.register('newPassword')}
          />
        </FormField>

        <FormField
          label={t('auth:resetPassword.confirmPasswordLabel')}
          htmlFor="confirmPassword"
          error={form.formState.errors.confirmPassword && t(form.formState.errors.confirmPassword.message ?? '')}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={!!form.formState.errors.confirmPassword}
            {...form.register('confirmPassword')}
          />
        </FormField>

        {mutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {authErrorMessage(t, 'resetPassword', mutation.error)}
          </p>
        )}

        <Button type="submit" loading={mutation.isPending} className="w-full">
          {t('auth:resetPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
