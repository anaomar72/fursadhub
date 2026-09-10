import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loginSchema, toLoginPayload, type LoginFormValues } from '../schemas/loginSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { Button, Checkbox, FormField, Input, PasswordInput } from '../../../components/ui'
import { useAuth } from '../../../lib/auth/AuthContext'
import { resolveConsolePath, roleLandingPath } from '../roleRedirect'
import * as legalApi from '../../legal/api/legalApi'
import { PENDING_TERMS_ACCEPTANCE_KEY } from '../../legal/pendingAcceptance'

interface LocationState {
  from?: { pathname: string }
}

/**
 * "Remember me" has no backend counterpart — the refresh-token cookie already persists the
 * session for its full lifetime regardless (CLAUDE.md section 17). Here it only controls whether
 * this browser's last email is remembered locally to prefill the field next time; nothing
 * security-relevant is stored.
 */
const REMEMBERED_EMAIL_KEY = 'fursadhub-remembered-email'

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role')
  const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY)
  const [rememberMe, setRememberMe] = useState(!!rememberedEmail)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: rememberedEmail ?? '', password: '' },
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data, variables) => {
      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, variables.email ?? variables.username ?? '')
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
      }

      signIn(data.accessToken)
      await submitPendingTermsAcceptance()

      const redirectFrom = (location.state as LocationState | null)?.from?.pathname
      const redirectTo = redirectFrom ?? roleLandingPath(role) ?? (await resolveConsolePath())
      navigate(redirectTo, { replace: true })
    },
  })

  return (
    <AuthCard title={t('auth:login.title')} subtitle={t('auth:login.subtitle')}>
      <form className="flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((values) => loginMutation.mutate(toLoginPayload(values)))}>
        <FormField
          label={t('auth:login.identifierLabel')}
          htmlFor="identifier"
          error={form.formState.errors.identifier && t(form.formState.errors.identifier.message ?? '')}
        >
          {/* Backend Phase B5.5: managed staff sign in with a username, so this cannot be type="email". */}
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder={t('auth:login.identifierPlaceholder')}
            invalid={!!form.formState.errors.identifier}
            {...form.register('identifier')}
          />
        </FormField>

        <FormField
          label={t('auth:login.passwordLabel')}
          htmlFor="password"
          error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder={t('auth:login.passwordPlaceholder')}
            invalid={!!form.formState.errors.password}
            showLabel={t('common:password.show')}
            hideLabel={t('common:password.hide')}
            {...form.register('password')}
          />
        </FormField>

        <div className="flex items-center justify-between gap-4">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            label={t('auth:login.rememberMe')}
          />
          <Link to="/forgot-password" className="shrink-0 text-sm font-medium text-link hover:underline">
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
        <Link to={role ? `/register?role=${role}` : '/register'} className="font-medium text-link hover:underline">
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
