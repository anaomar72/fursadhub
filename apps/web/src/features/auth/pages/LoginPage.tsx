import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loginSchema, type LoginFormValues } from '../schemas/loginSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { Button, FormField, Input } from '../../../components/ui'
import { useAuth } from '../../../lib/auth/AuthContext'
import { resolveConsolePath, roleLandingPath } from '../roleRedirect'
import * as legalApi from '../../legal/api/legalApi'
import { PENDING_TERMS_ACCEPTANCE_KEY } from '../../legal/pendingAcceptance'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role')

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      signIn(data.accessToken)
      await submitPendingTermsAcceptance()

      const redirectFrom = (location.state as LocationState | null)?.from?.pathname
      const redirectTo = redirectFrom ?? roleLandingPath(role) ?? (await resolveConsolePath())
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
        <Link to={role ? `/register?role=${role}` : '/register'} className="font-medium text-brand-primary hover:underline">
          {t('auth:login.createAccount')}
        </Link>
      </p>
    </AuthCard>
  )
}

/**
 * Records, for real, the acceptances a visitor agreed to on the registration form — now that
 * signing in has produced the authenticated session `POST /me/terms-acceptances` requires
 * (CLAUDE.md sections 12, 49). Best-effort: a failure here must not block sign-in, since
 * `TermsAcceptanceGate` will simply catch the still-outstanding document on the next screen and
 * prompt normally, rather than the visitor being logged in with nowhere to go.
 */
async function submitPendingTermsAcceptance(): Promise<void> {
  const raw = sessionStorage.getItem(PENDING_TERMS_ACCEPTANCE_KEY)
  if (!raw) return
  sessionStorage.removeItem(PENDING_TERMS_ACCEPTANCE_KEY)

  try {
    const documentIds = JSON.parse(raw) as string[]
    await Promise.all(documentIds.map((id) => legalApi.acceptLegalDocument(id)))
  } catch {
    // Swallowed on purpose — see the doc comment above.
  }
}
