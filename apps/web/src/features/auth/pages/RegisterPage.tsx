import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { registerSchema, type RegisterFormValues } from '../schemas/registerSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { PasswordRequirements } from '../components/PasswordRequirements'
import type { VerifyEmailLocationState } from './VerifyEmailPage'
import { Alert, Button, Checkbox, FormField, Icon, Input, PasswordInput } from '../../../components/ui'
import { ACCOUNT_TYPE_OPTIONS, type SelfServiceAccountType } from '../accountTypes'
import { cn } from '../../../lib/utils/cn'
import * as legalApi from '../../legal/api/legalApi'
import { PENDING_TERMS_ACCEPTANCE_KEY } from '../../legal/pendingAcceptance'

type RegisterRole = SelfServiceAccountType

function readRole(value: string | null): RegisterRole {
  return value === 'organization' || value === 'university' ? value : 'student'
}

/**
 * Account creation. Order follows the decision a person makes: first WHO they are registering as
 * (with what happens next for that kind of account), then their sign-in details, then consent.
 *
 * <p>The account type is presentation and routing only — the request body is still just email and
 * password; the type rides along in the URL to choose the next screen's guidance and the first
 * destination after sign-in. Nothing about it is trusted by the server.
 */
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
  const password = useWatch({ control: form.control, name: 'password' })
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
      // `registered` makes the next screen acknowledge what just happened rather than opening cold
      // on a code field. Presentation only — it changes one confirmation line and grants nothing.
      // The address itself travels in navigation state, never the URL (see VerifyEmailPage).
      const params = new URLSearchParams({ role, registered: '1' })
      navigate(`/verify-email?${params.toString()}`, { state: { email: data.email } satisfies VerifyEmailLocationState })
    },
  })

  return (
    <AuthCard title={t('auth:register.title')} subtitle={t('auth:register.subtitle')}>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          if (termsGateActive && !acceptedTerms) {
            setTermsError(true)
            return
          }
          registerMutation.mutate({ email: values.email, password: values.password })
        })}
      >
        {/* ------------------------------------------------------------ account type */}
        <fieldset className="min-w-0">
          <legend className="text-label text-foreground">{t('auth:register.roleSelector.label')}</legend>
          <div className="mt-2.5 grid gap-2">
            {ACCOUNT_TYPE_OPTIONS.map(({ type: option, icon }) => {
              const selected = role === option
              return (
                <label
                  key={option}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors duration-150 motion-reduce:transition-none',
                    'focus-within:ring-2 focus-within:ring-focus-ring',
                    selected ? 'border-action-primary bg-brand-accent-soft' : 'border-border-strong bg-surface hover:bg-control-hover',
                  )}
                >
                  <input
                    type="radio"
                    name="account-type"
                    value={option}
                    checked={selected}
                    onChange={() => selectRole(option)}
                    // Named by the title only; the explanation is its description.
                    aria-labelledby={`account-type-${option}-label`}
                    aria-describedby={`account-type-${option}-hint`}
                    className="sr-only"
                  />
                  {/* The visible radio mark: filled when chosen, so the state never rests on colour. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                      selected ? 'border-action-primary' : 'border-border-strong',
                    )}
                  >
                    {selected && <span className="size-2.5 rounded-full bg-action-primary" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span id={`account-type-${option}-label`} className="flex items-center gap-2 text-body font-semibold text-foreground">
                      <Icon name={icon} className="size-4 shrink-0 text-foreground-secondary" />
                      {t(`auth:register.roleSelector.${option}`)}
                    </span>
                    <span id={`account-type-${option}-hint`} className="mt-1 block text-caption text-foreground-secondary">
                      {t(`auth:register.roleSelector.${option}Hint`)}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 text-caption text-foreground-secondary">
            <Icon name="info" className="mt-px size-3.5 shrink-0" />
            {t('auth:register.staffNote')}
          </p>
        </fieldset>

        {/* ------------------------------------------------------------ sign-in details */}
        <fieldset className="flex min-w-0 flex-col gap-4 border-t border-border pt-6">
          <legend className="sr-only">{t('auth:register.accountSection')}</legend>
          <FormField
            label={t('auth:register.emailLabel')}
            htmlFor="email"
            required
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

          <div className="flex flex-col gap-2">
            <FormField
              label={t('auth:register.passwordLabel')}
              htmlFor="password"
              required
              // Stated before typing, not only after a failed submit. Mirrors PasswordPolicy.REGEX.
              hint={t('auth:register.passwordHint')}
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
            <PasswordRequirements id="password-requirements" value={password ?? ''} />
          </div>

          <FormField
            label={t('auth:register.confirmPasswordLabel')}
            htmlFor="confirmPassword"
            required
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
        </fieldset>

        {termsGateActive && (
          <div>
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
            {termsError && (
              <p className="mt-2 flex items-start gap-1.5 text-body text-danger" role="alert">
                <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                {t('auth:register.acceptTermsRequired')}
              </p>
            )}
          </div>
        )}

        {registerMutation.isError && <Alert tone="danger">{authErrorMessage(t, 'register', registerMutation.error)}</Alert>}

        <div>
          <Button type="submit" size="lg" loading={registerMutation.isPending} className="w-full">
            {t('auth:register.submit')}
          </Button>
          {/* What happens the moment they press it — so the next screen is not a surprise. */}
          <p className="mt-3 text-center text-caption text-foreground-secondary">{t('auth:register.nextStep')}</p>
        </div>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-center text-body text-foreground-secondary">
        {t('auth:register.haveAccount')}{' '}
        <Link
          to={`/login?role=${role}`}
          className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {t('auth:register.signIn')}
        </Link>
      </p>
    </AuthCard>
  )
}
