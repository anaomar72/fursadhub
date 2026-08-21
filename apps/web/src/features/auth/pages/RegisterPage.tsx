import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { registerSchema, type RegisterFormValues } from '../schemas/registerSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { AnimatedCheck, Button, FormField, Input } from '../../../components/ui'

export function RegisterPage() {
  const { t } = useTranslation()
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => setRegisteredEmail(data.email),
  })

  const resendMutation = useMutation({ mutationFn: authApi.resendVerification })

  if (registeredEmail) {
    return (
      <AuthCard title={t('auth:register.successTitle')}>
        <AnimatedCheck label={t('auth:register.successTitle')} />
        <p className="mt-4 text-center text-sm text-foreground-secondary">
          {t('auth:register.successBody', { email: registeredEmail })}
        </p>

        {resendMutation.isSuccess ? (
          <p className="mt-4 text-center text-sm text-success">{t('auth:register.resendSuccess')}</p>
        ) : (
          <button
            type="button"
            className="mt-4 block w-full text-center text-sm font-medium text-brand-primary hover:underline disabled:opacity-60"
            onClick={() => resendMutation.mutate(registeredEmail)}
            disabled={resendMutation.isPending}
          >
            {t('auth:register.resendLink')}
          </button>
        )}
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth:register.title')} subtitle={t('auth:register.subtitle')}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          registerMutation.mutate({ email: values.email, password: values.password }),
        )}
      >
        <FormField
          label={t('auth:register.emailLabel')}
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

        <FormField
          label={t('auth:register.passwordLabel')}
          htmlFor="password"
          error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
        </FormField>

        <FormField
          label={t('auth:register.confirmPasswordLabel')}
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

        {registerMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {authErrorMessage(t, 'register', registerMutation.error)}
          </p>
        )}

        <Button type="submit" loading={registerMutation.isPending} className="mt-2 w-full">
          {t('auth:register.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-secondary">
        {t('auth:register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-brand-primary hover:underline">
          {t('auth:register.signIn')}
        </Link>
      </p>
    </AuthCard>
  )
}
