import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { registerSchema, type RegisterFormValues } from '../schemas/registerSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { Button, Checkbox, FormField, Input, PasswordInput } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'
import * as legalApi from '../../legal/api/legalApi'
import { PENDING_TERMS_ACCEPTANCE_KEY } from '../../legal/pendingAcceptance'

type RegisterRole = 'student' | 'organization' | 'university'

const ROLE_OPTIONS: readonly RegisterRole[] = ['student', 'organization', 'university']

function readRole(value: string | null): RegisterRole {
  return value === 'organization' || value === 'university' ? value : 'student'
}

export function RegisterPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = readRole(searchParams.get('role'))
  const locale = i18n.resolvedLanguage ?? 'en'

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)

  function selectRole(next: RegisterRole) {
    const params = new URLSearchParams(searchParams)
    params.set('role', next)
    setSearchParams(params, { replace: true })
  }

  // Public and unauthenticated — someone deciding whether to register must be able to read the
  // terms first (CLAUDE.md section 49). Documents with requiresAcceptance: false (or an empty
  // pilot with nothing published yet) never block the form — same fail-open philosophy as
  // TermsAcceptanceGate.
  const legalQuery = useQuery({
    queryKey: ['legal-documents', 'public', locale],
    queryFn: () => legalApi.listPublicLegalDocuments(locale),
    retry: false,
  })
  const documentsRequiringAcceptance = (legalQuery.data ?? []).filter((doc) => doc.requiresAcceptance)
  const termsGateActive = documentsRequiringAcceptance.length > 0

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Recorded for real once the account authenticates for the first time (see LoginPage) —
      // this is only a short-lived handoff, not the authoritative acceptance record.
      if (termsGateActive) {
        sessionStorage.setItem(
          PENDING_TERMS_ACCEPTANCE_KEY,
          JSON.stringify(documentsRequiringAcceptance.map((doc) => doc.id)),
        )
      }
      const params = new URLSearchParams({ email: data.email, role })
      navigate(`/verify-email?${params.toString()}`)
    },
  })

  return (
    <AuthCard title={t('auth:register.title')} subtitle={t('auth:register.subtitle')}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          if (termsGateActive && !acceptedTerms) {
            setTermsError(true)
            return
          }
          registerMutation.mutate({ email: values.email, password: values.password })
        })}
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
            placeholder={t('auth:register.emailPlaceholder')}
            invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
        </FormField>

        <FormField
          label={t('auth:register.passwordLabel')}
          htmlFor="password"
          error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder={t('auth:register.passwordPlaceholder')}
            invalid={!!form.formState.errors.password}
            showLabel={t('common:password.show')}
            hideLabel={t('common:password.hide')}
            {...form.register('password')}
          />
        </FormField>

        <FormField
          label={t('auth:register.confirmPasswordLabel')}
          htmlFor="confirmPassword"
          error={form.formState.errors.confirmPassword && t(form.formState.errors.confirmPassword.message ?? '')}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder={t('auth:register.confirmPasswordPlaceholder')}
            invalid={!!form.formState.errors.confirmPassword}
            showLabel={t('common:password.show')}
            hideLabel={t('common:password.hide')}
            {...form.register('confirmPassword')}
          />
        </FormField>

        <div>
          <span className="text-sm font-medium text-foreground">{t('auth:register.roleSelector.label')}</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={role === option}
                onClick={() => selectRole(option)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-md border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                  role === option
                    ? 'border-brand-primary bg-brand-blue-soft text-brand-primary dark:border-info dark:bg-info-bg dark:text-info'
                    : 'border-border text-foreground-secondary hover:bg-control-hover',
                )}
              >
                <RoleIcon role={option} className="size-5" />
                {t(`auth:register.roleSelector.${option}`)}
              </button>
            ))}
          </div>
        </div>

        {termsGateActive && (
          <Checkbox
            id="accept-terms"
            checked={acceptedTerms}
            onChange={(event) => {
              setAcceptedTerms(event.target.checked)
              if (event.target.checked) setTermsError(false)
            }}
            invalid={termsError}
            label={
              <span>
                {t('auth:register.acceptTermsPrefix')}{' '}
                {documentsRequiringAcceptance.map((doc, index) => (
                  <span key={doc.id}>
                    <a
                      href={`/legal/${doc.documentType.toLowerCase().replace(/_/g, '-')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-link underline-offset-2 hover:underline"
                    >
                      {t(`legal:documentTypes.${doc.documentType}`)}
                    </a>
                    {index < documentsRequiringAcceptance.length - 2
                      ? ', '
                      : index === documentsRequiringAcceptance.length - 2
                        ? ` ${t('auth:register.acceptTermsAnd')} `
                        : ''}
                  </span>
                ))}
              </span>
            }
          />
        )}
        {termsError && (
          <p className="text-sm text-danger" role="alert">
            {t('auth:register.acceptTermsRequired')}
          </p>
        )}

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
        <Link to={`/login?role=${role}`} className="font-medium text-link hover:underline">
          {t('auth:register.signIn')}
        </Link>
      </p>
    </AuthCard>
  )
}

function RoleIcon({ role, className }: { role: RegisterRole; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {role === 'student' ? (
        <>
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
        </>
      ) : role === 'organization' ? (
        <>
          <rect x="3" y="8" width="18" height="12" rx="1.5" />
          <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </>
      ) : (
        <path d="m3 10 9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18" />
      )}
    </svg>
  )
}
