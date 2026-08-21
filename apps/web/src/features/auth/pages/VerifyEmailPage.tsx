import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/emailOnlySchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { AnimatedCheck, Button, FormField, Input, OtpCodeInput } from '../../../components/ui'
import { ApiError } from '../../../lib/api/client'

const CODE_LENGTH = 4
const RESEND_COOLDOWN_SECONDS = 60

/**
 * FursadHub verification screen (CLAUDE.md section 13 / BRAND_AND_UI_GUIDELINES.md section 14):
 * register -> 4-digit code emailed -> entered here -> auto-submits on the 4th digit -> the
 * approved one-time VERIFIED animation -> stable verified state. The email address arrives via
 * `?email=` from RegisterPage's redirect (or, if the page is opened directly, the mini form below
 * requests a fresh code and adopts that email).
 */
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(email ? Date.now() + RESEND_COOLDOWN_SECONDS * 1000 : null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const verifyMutation = useMutation({ mutationFn: authApi.verifyEmail })
  const resendMutation = useMutation({ mutationFn: authApi.resendVerification })
  const requestCodeForm = useForm<EmailOnlyFormValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } })

  useEffect(() => {
    if (!cooldownEndsAt) {
      setSecondsLeft(0)
      return
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [cooldownEndsAt])

  function startCooldown() {
    setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000)
  }

  function handleCodeChange(next: string) {
    setCode(next)
    if (verifyMutation.isError) {
      verifyMutation.reset()
    }
  }

  function submit(fullCode: string) {
    if (verifyMutation.isPending || verifyMutation.isSuccess) {
      return
    }
    verifyMutation.mutate({ email, code: fullCode })
  }

  function handleResend() {
    resendMutation.mutate(email, {
      onSuccess: () => {
        startCooldown()
        setCode('')
        verifyMutation.reset()
      },
    })
  }

  if (!email) {
    return (
      <AuthCard title={t('auth:verifyEmail.missingEmailTitle')} subtitle={t('auth:verifyEmail.missingEmailBody')}>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={requestCodeForm.handleSubmit((values) =>
            resendMutation.mutate(values.email, {
              onSuccess: () => {
                setEmail(values.email)
                setSearchParams({ email: values.email })
                startCooldown()
              },
            }),
          )}
        >
          <FormField
            label={t('auth:verifyEmail.emailLabel')}
            htmlFor="request-code-email"
            error={requestCodeForm.formState.errors.email && t(requestCodeForm.formState.errors.email.message ?? '')}
          >
            <Input
              id="request-code-email"
              type="email"
              autoComplete="email"
              invalid={!!requestCodeForm.formState.errors.email}
              {...requestCodeForm.register('email')}
            />
          </FormField>
          {resendMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {authErrorMessage(t, 'verifyEmail', resendMutation.error)}
            </p>
          )}
          <Button type="submit" loading={resendMutation.isPending} className="w-full">
            {t('auth:verifyEmail.sendCode')}
          </Button>
        </form>
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

  const isLocked =
    verifyMutation.error instanceof ApiError && verifyMutation.error.body.code === 'EMAIL_VERIFICATION_CODE_LOCKED'

  return (
    <AuthCard title={t('auth:verifyEmail.title')} subtitle={t('auth:verifyEmail.subtitle', { email })}>
      <OtpCodeInput
        length={CODE_LENGTH}
        value={code}
        onChange={handleCodeChange}
        onComplete={submit}
        disabled={verifyMutation.isPending}
        invalid={verifyMutation.isError}
        label={t('auth:verifyEmail.codeLabel')}
      />

      {verifyMutation.isError && (
        <p className="mt-4 text-center text-sm text-danger" role="alert">
          {authErrorMessage(t, 'verifyEmail', verifyMutation.error)}
        </p>
      )}

      <Button
        onClick={() => submit(code)}
        loading={verifyMutation.isPending}
        disabled={code.length !== CODE_LENGTH || verifyMutation.isPending || isLocked}
        className="mt-6 w-full"
      >
        {t('auth:verifyEmail.verify')}
      </Button>

      <div className="mt-6 text-center text-sm text-foreground-secondary">
        {secondsLeft > 0 ? (
          <span>{t('auth:verifyEmail.resendCooldown', { seconds: secondsLeft })}</span>
        ) : (
          <button
            type="button"
            className="font-medium text-brand-primary hover:underline disabled:opacity-60"
            onClick={handleResend}
            disabled={resendMutation.isPending}
          >
            {t('auth:verifyEmail.resend')}
          </button>
        )}
        {resendMutation.isSuccess && secondsLeft > 0 && (
          <p className="mt-2 text-success">{t('auth:verifyEmail.resendSuccess')}</p>
        )}
        {resendMutation.isError && (
          <p className="mt-2 text-danger" role="alert">
            {authErrorMessage(t, 'verifyEmail', resendMutation.error)}
          </p>
        )}
      </div>
    </AuthCard>
  )
}
