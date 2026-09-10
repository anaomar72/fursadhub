import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/emailOnlySchema'
import * as authApi from '../api/authApi'
import { AuthCard } from '../components/AuthCard'
import { AuthStatus } from '../components/AuthStatus'
import { Button, ButtonLink, FormField, Input } from '../../../components/ui'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const form = useForm<EmailOnlyFormValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } })
  const mutation = useMutation({ mutationFn: (values: EmailOnlyFormValues) => authApi.forgotPassword(values.email) })

  if (mutation.isSuccess) {
    return (
      // `info`, not `success`. The server answers identically whether or not that address has an
      // account (RequestPasswordResetService), so this screen cannot honestly claim an email was
      // sent to anyone — it states the condition, which is what the security contract allows. A
      // green tick here would be the UI asserting something the API deliberately refused to say.
      <AuthStatus
        tone="info"
        title={t('auth:forgotPassword.successTitle')}
        description={t('auth:forgotPassword.successBody')}
        actions={
          <ButtonLink variant="outline" to="/login">
            {t('auth:forgotPassword.backToLoginAction')}
          </ButtonLink>
        }
      />
    )
  }

  return (
    <AuthCard title={t('auth:forgotPassword.title')} subtitle={t('auth:forgotPassword.subtitle')}>
      <form className="flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormField
          label={t('auth:forgotPassword.emailLabel')}
          htmlFor="email"
          error={form.formState.errors.email && t(form.formState.errors.email.message ?? '')}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth:forgotPassword.emailPlaceholder')}
            invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
        </FormField>
        <Button type="submit" loading={mutation.isPending} className="w-full">
          {t('auth:forgotPassword.submit')}
        </Button>
      </form>
      <BackToLogin />
    </AuthCard>
  )
}

export function BackToLogin() {
  const { t } = useTranslation()
  return (
    <p className="mt-6 text-center text-sm text-foreground-secondary">
      {t('auth:forgotPassword.backToLoginPrefix')}{' '}
      <Link to="/login" className="font-medium text-link hover:underline">
        {t('auth:forgotPassword.backToLoginLink')}
      </Link>
    </p>
  )
}
