import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/emailOnlySchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { AuthStatus } from '../components/AuthStatus'
import { Alert, Button, ButtonLink, FormField, Input, OtpCodeInput } from '../../../components/ui'
import { ApiError } from '../../../lib/api/client'

const CODE_LENGTH = 4
const RESEND_COOLDOWN_SECONDS = 60

/**
 * The success line, chosen from the account kind this registration was started for.
 *
 * <p>The value comes from the query string, so it is not authoritative — but nothing here depends
 * on it being trustworthy. It only selects which NEXT STEP sentence to show; every branch states
 * exactly the same fact about what was verified, and none of them asserts an approval. A tampered
 * value changes one sentence of guidance on the tamperer's own screen and nothing else.
 */
function nextStepKey(role: string | null): string {
  if (role === 'organization') return 'auth:verifyEmail.successBodyOrganization'
  if (role === 'university') return 'auth:verifyEmail.successBodyUniversity'
  return 'auth:verifyEmail.successBody'
}

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
  const role = searchParams.get('role')
  const justRegistered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(email ? Date.now() + RESEND_COOLDOWN_SECONDS * 1000 : null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  // The last code actually sent to the server — see the guard in `submit`.
  const lastSubmittedCode = useRef<string | null>(null)

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
    /*
     * The same code is never sent twice. `OtpCodeInput` calls `onComplete` whenever the field is
     * full, which includes re-fires that follow a keystroke's later events — so a rejected code
     * would immediately be sent again, spending another of the server's five attempts on input the
     * user has not touched since. The in-flight guard above did not catch that, because the second
     * attempt starts after the first has already failed. Changing any digit clears this, since
     * `handleCodeChange` resets the mutation and a different string no longer matches.
     */
    if (lastSubmittedCode.current === fullCode) {
      return
    }
    lastSubmittedCode.current = fullCode
    verifyMutation.mutate({ email, code: fullCode })
  }

  function handleResend() {
    resendMutation.mutate(email, {
      onSuccess: () => {
        startCooldown()
        setCode('')
        verifyMutation.reset()
        // A fresh challenge is on its way, so a code that was rejected against the OLD one is
        // allowed to be tried again — the digits may legitimately repeat.
        lastSubmittedCode.current = null
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
            <p className="text-body text-danger" role="alert">
              {authErrorMessage(t, 'verifyEmail', resendMutation.error)}
            </p>
          )}
          <Button type="submit" size="lg" loading={resendMutation.isPending} className="w-full">
            {t('auth:verifyEmail.sendCode')}
          </Button>
        </form>
      </AuthCard>
    )
  }

  // Verification is a request to the server, not an instant local toggle, so it gets its own
  // branded waiting state rather than only a spinner inside the button. The code auto-submits on
  // the fourth digit, which means the form the user was looking at is gone the moment they finish
  // typing; without this they would be left staring at a disabled field with no explanation.
  if (verifyMutation.isPending) {
    return <AuthStatus tone="loading" title={t('auth:verifyEmail.verifyingTitle')} description={t('auth:verifyEmail.verifyingBody')} />
  }

  if (verifyMutation.isSuccess) {
    return (
      <AuthStatus
        tone="success"
        title={t('auth:verifyEmail.successTitle')}
        // Role-aware, and careful about what it claims. It says what has happened (this address is
        // confirmed) and what to do next for the kind of account being set up. It does NOT say the
        // organization or university is verified, or that enrollment is verified — those are
        // separate reviews that have not happened (CLAUDE.md section 13/27).
        description={t(nextStepKey(role))}
        actions={
          <ButtonLink to={role ? `/login?role=${role}` : '/login'} className="w-full">
            {t('auth:verifyEmail.continue')}
          </ButtonLink>
        }
      />
    )
  }

  const errorCode = verifyMutation.error instanceof ApiError ? verifyMutation.error.body.code : null
  const isLocked = errorCode === 'EMAIL_VERIFICATION_CODE_LOCKED'

  /*
   * Two failures END the attempt rather than inviting a retype: an expired challenge and a locked
   * one. Leaving those as a red line under a code field the user can still type into asks them to
   * keep trying something that cannot now succeed. They get the recoverable state instead — what
   * happened, the one control that fixes it, and a way out.
   *
   * Every OTHER failure stays inline on the form, because retyping IS the fix.
   *
   * Note what is deliberately absent: an "already verified" screen. The server has no way to say
   * that. An account with nothing left to verify has no active challenge, so it comes back as
   * EMAIL_VERIFICATION_CODE_INVALID — indistinguishable from a typo. Rendering a confident
   * "you are already verified" on that code would be a guess presented as a fact, so the inline
   * message names both possibilities instead and the sign-in route is offered below.
   */
  if (errorCode === 'EMAIL_VERIFICATION_CODE_EXPIRED' || isLocked) {
    return (
      <AuthStatus
        tone="warning"
        title={t(isLocked ? 'auth:verifyEmail.lockedTitle' : 'auth:verifyEmail.expiredTitle')}
        description={t(isLocked ? 'auth:verifyEmail.lockedBody' : 'auth:verifyEmail.expiredBody')}
        actions={
          <>
            <Button onClick={handleResend} loading={resendMutation.isPending} disabled={secondsLeft > 0}>
              {secondsLeft > 0 ? t('auth:verifyEmail.resendCooldown', { seconds: secondsLeft }) : t('auth:verifyEmail.resend')}
            </Button>
            <ButtonLink variant="outline" to={role ? `/login?role=${role}` : '/login'}>
              {t('auth:verifyEmail.backToLogin')}
            </ButtonLink>
          </>
        }
      >
        {resendMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {authErrorMessage(t, 'verifyEmail', resendMutation.error)}
          </p>
        )}
      </AuthStatus>
    )
  }

  return (
    <AuthCard
      title={t('auth:verifyEmail.title')}
      subtitle={t('auth:verifyEmail.subtitle', { email })}
    >
      {/* Arriving straight from registration. It confirms the one thing that definitely happened —
          the account exists — and nothing beyond it: not that the address is valid, not that any
          institution has been approved. Someone who opens this URL later never sees it. */}
      {justRegistered && (
        <Alert tone="success" className="mb-6">
          {t('auth:verifyEmail.registeredNotice')}
        </Alert>
      )}

      <OtpCodeInput
        length={CODE_LENGTH}
        value={code}
        onChange={handleCodeChange}
        onComplete={submit}
        disabled={verifyMutation.isPending}
        invalid={verifyMutation.isError}
        label={t('auth:verifyEmail.codeLabel')}
      />
      {/* Says what the auto-submit will do BEFORE it does it, so the form disappearing on the
          fourth digit is expected rather than startling. Presentation only — the submit rules
          (whole code only, never the same code twice) live in `submit` above. */}
      <p className="mt-3 text-center text-caption text-foreground-secondary">{t('auth:verifyEmail.autoHint')}</p>

      {verifyMutation.isError && (
        <p className="mt-4 text-center text-body text-danger" role="alert">
          {authErrorMessage(t, 'verifyEmail', verifyMutation.error)}
        </p>
      )}

      <Button
        onClick={() => submit(code)}
        loading={verifyMutation.isPending}
        disabled={code.length !== CODE_LENGTH || verifyMutation.isPending || isLocked}
        size="lg"
        className="mt-6 w-full"
      >
        {t('auth:verifyEmail.verify')}
      </Button>

      <div className="mt-6 text-center text-body text-foreground-secondary">
        {secondsLeft > 0 ? (
          <span>{t('auth:verifyEmail.resendCooldown', { seconds: secondsLeft })}</span>
        ) : (
          <button
            type="button"
            className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
            onClick={handleResend}
            disabled={resendMutation.isPending}
          >
            {t('auth:verifyEmail.resend')}
          </button>
        )}
        {resendMutation.isSuccess && secondsLeft > 0 && (
          <p className="mt-2 text-success" role="status">{t('auth:verifyEmail.resendSuccess')}</p>
        )}
        {resendMutation.isError && (
          <p className="mt-2 text-danger" role="alert">
            {authErrorMessage(t, 'verifyEmail', resendMutation.error)}
          </p>
        )}
      </div>

      {/* The route out for someone whose address is in fact already verified. The server cannot
          tell us that (see the comment above the expired/locked branch), so instead of guessing,
          the page simply keeps the door to sign-in visible from here. */}
      <p className="mt-8 border-t border-border pt-6 text-center text-body text-foreground-secondary">
        {t('auth:verifyEmail.alreadyVerifiedPrompt')}{' '}
        <Link to={role ? `/login?role=${role}` : '/login'} className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
          {t('auth:verifyEmail.backToLogin')}
        </Link>
      </p>
    </AuthCard>
  )
}
