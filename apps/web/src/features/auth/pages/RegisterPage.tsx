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
import { Button, Checkbox, FormField, Input } from '../../../components/ui'
import * as legalApi from '../../legal/api/legalApi'
import { PENDING_TERMS_ACCEPTANCE_KEY } from '../../legal/pendingAcceptance'

type RegisterRole = 'student' | 'organization' | 'university'

const ROLE_COPY_KEYS: Record<RegisterRole, string> = {
  student: 'student',
  organization: 'organization',
  university: 'university',
}

function readRole(value: string | null): RegisterRole | null {
  return value === 'student' || value === 'organization' || value === 'university' ? value : null
}

export function RegisterPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = readRole(searchParams.get('role'))
  const locale = i18n.resolvedLanguage ?? 'en'

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)

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
      const params = new URLSearchParams({ email: data.email })
      if (role) params.set('role', role)
      navigate(`/verify-email?${params.toString()}`)
    },
  })

  const title = role ? t(`auth:register.roles.${ROLE_COPY_KEYS[role]}.title`) : t('auth:register.title')
  const subtitle = role ? t(`auth:register.roles.${ROLE_COPY_KEYS[role]}.subtitle`) : t('auth:register.subtitle')

  return (
    <AuthCard title={title} subtitle={subtitle}>
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
                      className="font-medium text-brand-primary underline-offset-2 hover:underline"
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
        <Link to={role ? `/login?role=${role}` : '/login'} className="font-medium text-brand-primary hover:underline">
          {t('auth:register.signIn')}
        </Link>
      </p>
    </AuthCard>
  )
}
