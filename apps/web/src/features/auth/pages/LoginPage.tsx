import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginSchema, type LoginFormValues } from '../schemas/loginSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { Button, FormField, Input } from '../../../components/ui'
import { useAuth } from '../../../lib/auth/AuthContext'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      signIn(data.accessToken)
      const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/'
      navigate(redirectTo, { replace: true })
    },
  })

  return (
    <AuthCard title={t('auth:login.title')} subtitle={t('auth:login.subtitle')}>
      <form className="flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
        <FormField
          label={t('auth:login.emailLabel')}
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
          label={t('auth:login.passwordLabel')}
          htmlFor="password"
          error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
        </FormField>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-primary hover:underline">
            {t('auth:login.forgotPassword')}
          </Link>
        </div>

        {loginMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {authErrorMessage(t, 'login', loginMutation.error)}
          </p>
        )}

        <Button type="submit" loading={loginMutation.isPending} className="w-full">
          {t('auth:login.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-secondary">
        {t('auth:login.noAccount')}{' '}
        <Link to="/register" className="font-medium text-brand-primary hover:underline">
          {t('auth:login.createAccount')}
        </Link>
      </p>
    </AuthCard>
  )
}
