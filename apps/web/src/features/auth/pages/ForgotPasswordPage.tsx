import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/emailOnlySchema'
import * as authApi from '../api/authApi'
import { AuthCard } from '../components/AuthCard'
import { Button, FormField, Input } from '../../../components/ui'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const form = useForm<EmailOnlyFormValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } })
  const mutation = useMutation({ mutationFn: (values: EmailOnlyFormValues) => authApi.forgotPassword(values.email) })

  if (mutation.isSuccess) {
    return (
      <AuthCard title={t('auth:forgotPassword.successTitle')}>
        <p className="text-center text-sm text-foreground-secondary">{t('auth:forgotPassword.successBody')}</p>
        <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-primary hover:underline">
          {t('auth:forgotPassword.backToLogin')}
        </Link>
      </AuthCard>
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
            invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
        </FormField>
        <Button type="submit" loading={mutation.isPending} className="w-full">
          {t('auth:forgotPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
