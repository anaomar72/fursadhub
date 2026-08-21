import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/emailOnlySchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { AnimatedCheck, Button, FormField, Input, LoadingSpinner } from '../../../components/ui'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const verifyMutation = useMutation({ mutationFn: authApi.verifyEmail })
  const resendMutation = useMutation({ mutationFn: authApi.resendVerification })
  const resendForm = useForm<EmailOnlyFormValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } })

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token)
    }
    // Only re-run if the token itself changes; verifyMutation is stable enough for this one-shot effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const resendPanel = resendMutation.isSuccess ? (
    <p className="text-sm text-success">{t('auth:verifyEmail.resendSuccess')}</p>
  ) : (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={resendForm.handleSubmit((values) => resendMutation.mutate(values.email))}
    >
      <FormField
        label={t('auth:verifyEmail.resendEmailLabel')}
        htmlFor="resend-email"
        error={resendForm.formState.errors.email && t(resendForm.formState.errors.email.message ?? '')}
      >
        <Input
          id="resend-email"
          type="email"
          autoComplete="email"
          invalid={!!resendForm.formState.errors.email}
          {...resendForm.register('email')}
        />
      </FormField>
      <Button type="submit" loading={resendMutation.isPending} className="w-full">
        {t('auth:verifyEmail.resendSubmit')}
      </Button>
    </form>
  )

  if (!token) {
    return (
      <AuthCard title={t('auth:verifyEmail.errors.missingToken')}>
        <div className="mt-2">{resendPanel}</div>
      </AuthCard>
    )
  }

  if (verifyMutation.isPending || verifyMutation.isIdle) {
    return (
      <AuthCard title={t('auth:verifyEmail.verifying')}>
        <div className="flex justify-center py-6">
          <LoadingSpinner size="lg" />
        </div>
      </AuthCard>
    )
  }

  if (verifyMutation.isSuccess) {
    return (
      <AuthCard title={t('auth:verifyEmail.successTitle')}>
        <AnimatedCheck label={t('auth:verifyEmail.successTitle')} />
        <p className="mt-4 text-center text-sm text-foreground-secondary">{t('auth:verifyEmail.successBody')}</p>
        <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-primary hover:underline">
          {t('auth:verifyEmail.continue')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth:verifyEmail.resendTitle')}>
      <p className="mb-6 text-sm text-danger" role="alert">
        {authErrorMessage(t, 'verifyEmail', verifyMutation.error)}
      </p>
      {resendPanel}
    </AuthCard>
  )
}
