import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/resetPasswordSchema'
import * as authApi from '../api/authApi'
import { authErrorMessage } from '../api/errorMessage'
import { AuthCard } from '../components/AuthCard'
import { AuthStatus } from '../components/AuthStatus'
import { Alert, Button, ButtonLink, FormField, PasswordInput } from '../../../components/ui'
import { PasswordRequirements } from '../components/PasswordRequirements'
import { ApiError } from '../../../lib/api/client'
import { BackToLogin } from './ForgotPasswordPage'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  const newPassword = useWatch({ control: form.control, name: 'newPassword' })

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) => authApi.resetPassword({ token: token ?? '', newPassword: values.newPassword }),
  })

  // A reset URL with no token cannot be completed here at any point, so it is an error state with
  // the route that regenerates a valid link — not, as before, an error MESSAGE used as a page
  // heading with a bare link under it and no explanation of what to do or why.
  if (!token) {
    return (
      <AuthStatus
        tone="error"
        title={t('auth:resetPassword.errors.missingToken')}
        description={t('auth:resetPassword.missingTokenBody')}
        actions={
          <>
            <ButtonLink to="/forgot-password">{t('auth:resetPassword.requestNewLink')}</ButtonLink>
            <ButtonLink variant="outline" to="/login">
              {t('auth:forgotPassword.backToLoginAction')}
            </ButtonLink>
          </>
        }
      />
    )
  }

  if (mutation.isSuccess) {
    return (
      <AuthStatus
        tone="success"
        title={t('auth:resetPassword.successTitle')}
        description={t('auth:resetPassword.successBody')}
        actions={<ButtonLink to="/login">{t('auth:resetPassword.continue')}</ButtonLink>}
      />
    )
  }

  /*
   * An expired or already-used token is only discoverable by submitting, so it arrives as a
   * mutation error rather than as a state this page can render on load. It is terminal in the same
   * way the missing token is — no amount of retyping a password fixes a dead link — so it gets the
   * recoverable screen instead of a red line above a form that cannot succeed.
   */
  const errorCode = mutation.error instanceof ApiError ? mutation.error.body.code : null
  if (errorCode === 'PASSWORD_RESET_TOKEN_EXPIRED' || errorCode === 'PASSWORD_RESET_TOKEN_INVALID') {
    return (
      <AuthStatus
        tone="warning"
        title={t(`auth:resetPassword.errors.${errorCode}`)}
        description={t('auth:resetPassword.linkDeadBody')}
        actions={
          <>
            <ButtonLink to="/forgot-password">{t('auth:resetPassword.requestNewLink')}</ButtonLink>
            <ButtonLink variant="outline" to="/login">
              {t('auth:forgotPassword.backToLoginAction')}
            </ButtonLink>
          </>
        }
      />
    )
  }

  return (
    <AuthCard title={t('auth:resetPassword.title')} subtitle={t('auth:resetPassword.subtitle')}>
      <form className="flex flex-col gap-5" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="flex flex-col gap-2">
          <FormField
            label={t('auth:resetPassword.newPasswordLabel')}
            htmlFor="newPassword"
            // The same policy as registration, stated before the first attempt (it used to appear
            // only as an error after a rejected submit).
            hint={t('auth:register.passwordHint')}
            error={form.formState.errors.newPassword && t(form.formState.errors.newPassword.message ?? '')}
          >
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              placeholder={t('auth:resetPassword.newPasswordPlaceholder')}
              invalid={!!form.formState.errors.newPassword}
              showLabel={t('common:password.show')}
              hideLabel={t('common:password.hide')}
              {...form.register('newPassword')}
            />
          </FormField>
          <PasswordRequirements id="new-password-requirements" value={newPassword ?? ''} />
        </div>

        <FormField
          label={t('auth:resetPassword.confirmPasswordLabel')}
          htmlFor="confirmPassword"
          error={form.formState.errors.confirmPassword && t(form.formState.errors.confirmPassword.message ?? '')}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder={t('auth:resetPassword.confirmPasswordPlaceholder')}
            invalid={!!form.formState.errors.confirmPassword}
            showLabel={t('common:password.show')}
            hideLabel={t('common:password.hide')}
            {...form.register('confirmPassword')}
          />
        </FormField>

        {mutation.isError && <Alert tone="danger">{authErrorMessage(t, 'resetPassword', mutation.error)}</Alert>}

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          {t('auth:resetPassword.submit')}
        </Button>
      </form>
      <BackToLogin />
    </AuthCard>
  )
}
