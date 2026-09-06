import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  PasswordInput,
  StatusBadge,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import {
  assignOfficerUsernameSchema,
  changeOfficerDisplayNameSchema,
  createVerificationOfficerSchema,
  type AssignOfficerUsernameFormValues,
  type ChangeOfficerDisplayNameFormValues,
  type CreateVerificationOfficerFormValues,
} from '../schemas/createVerificationOfficerSchema'
import type { PlatformTemporaryCredential, VerificationOfficer } from '../types'

/**
 * Provisioning managed verification officers (Backend Phase B5.6).
 *
 * <p>Sits beside the platform-role grant form rather than replacing it, because the two do different
 * things: that form gives a role to an account that already exists, this one creates the account. An
 * officer hired today has no FursadHub identity to look up, and making them self-register first —
 * then pasting their user ID into a grant form — is the workflow B5.6 exists to remove.
 *
 * <p><strong>There is no super-admin equivalent, and no role selector.</strong> The API endpoint
 * names the role in its path and assigns it server-side, so this panel has nothing to choose. That
 * is not a UI simplification standing in for a permission check — the backend refuses to provision
 * any other role, and refuses to touch the identity of any account holding SUPER_ADMIN at all.
 *
 * <p>The typed password is never echoed back and never stored: the form is reset on success, which
 * also clears it from browser form state. The one plaintext this panel does display is the
 * server-generated temporary password from a reset, which is held in component state only and is
 * gone on navigation (CLAUDE.md section 26A).
 */
export function VerificationOfficersPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [assigningFor, setAssigningFor] = useState<VerificationOfficer | null>(null)
  const [renaming, setRenaming] = useState<VerificationOfficer | null>(null)
  const [resetting, setResetting] = useState<VerificationOfficer | null>(null)
  const [credential, setCredential] = useState<PlatformTemporaryCredential | null>(null)

  const officersQuery = useQuery({
    queryKey: ['admin', 'verification-officers'],
    queryFn: adminApi.listVerificationOfficers,
  })

  const createForm = useForm<CreateVerificationOfficerFormValues>({
    resolver: zodResolver(createVerificationOfficerSchema),
    defaultValues: { displayName: '', username: '', email: '', password: '', confirmPassword: '' },
  })

  const assignForm = useForm<AssignOfficerUsernameFormValues>({
    resolver: zodResolver(assignOfficerUsernameSchema),
    defaultValues: { username: '' },
  })

  const renameForm = useForm<ChangeOfficerDisplayNameFormValues>({
    resolver: zodResolver(changeOfficerDisplayNameSchema),
    defaultValues: { displayName: '' },
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'verification-officers'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'platform-roles'] })
  }

  const createMutation = useMutation({
    mutationFn: adminApi.createVerificationOfficer,
    onSuccess: () => {
      // Clearing the form is what drops the typed password from browser state. The admin already
      // knows it — nothing is echoed back.
      createForm.reset({ displayName: '', username: '', email: '', password: '', confirmPassword: '' })
      setCreateOpen(false)
      invalidate()
    },
  })

  const assignMutation = useMutation({
    mutationFn: (values: AssignOfficerUsernameFormValues) =>
      adminApi.assignVerificationOfficerUsername(assigningFor!.userId, values.username),
    onSuccess: () => {
      assignForm.reset({ username: '' })
      setAssigningFor(null)
      invalidate()
    },
  })

  const renameMutation = useMutation({
    mutationFn: (values: ChangeOfficerDisplayNameFormValues) =>
      adminApi.changeVerificationOfficerDisplayName(renaming!.userId, values.displayName),
    onSuccess: () => {
      renameForm.reset({ displayName: '' })
      setRenaming(null)
      invalidate()
    },
  })

  const resetMutation = useMutation({
    mutationFn: (userId: string) => adminApi.resetVerificationOfficerPassword(userId),
    onSuccess: (result) => {
      setCredential(result)
      setResetting(null)
    },
  })

  const officers = officersQuery.data ?? []

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{t('admin:verificationOfficers.title')}</h2>
          <p className="text-sm text-foreground-secondary">
            {t('admin:verificationOfficers.description')}
          </p>
        </div>
        {!createOpen && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            {t('admin:verificationOfficers.create')}
          </Button>
        )}
      </div>

      {createOpen && (
        <form
          className="flex flex-col gap-4 border-t border-border pt-5"
          noValidate
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t('admin:verificationOfficers.displayNameLabel')}
              htmlFor="officer-display-name"
              className="sm:col-span-2"
              error={
                createForm.formState.errors.displayName &&
                t(createForm.formState.errors.displayName.message ?? '')
              }
            >
              <Input id="officer-display-name" type="text" autoComplete="off" {...createForm.register('displayName')} />
            </FormField>

            <FormField
              label={t('admin:verificationOfficers.usernameLabel')}
              htmlFor="officer-username"
              hint={t('admin:verificationOfficers.usernameHint')}
              error={
                createForm.formState.errors.username &&
                t(createForm.formState.errors.username.message ?? '')
              }
            >
              <Input id="officer-username" type="text" autoComplete="off" {...createForm.register('username')} />
            </FormField>

            <FormField
              label={t('admin:verificationOfficers.emailLabel')}
              htmlFor="officer-email"
              hint={t('admin:verificationOfficers.emailHint')}
              error={
                createForm.formState.errors.email && t(createForm.formState.errors.email.message ?? '')
              }
            >
              <Input id="officer-email" type="email" autoComplete="off" {...createForm.register('email')} />
            </FormField>

            <FormField
              label={t('admin:verificationOfficers.passwordLabel')}
              htmlFor="officer-password"
              error={
                createForm.formState.errors.password &&
                t(createForm.formState.errors.password.message ?? '')
              }
            >
              <PasswordInput
                id="officer-password"
                autoComplete="new-password"
                showLabel={t('common:password.show')}
                hideLabel={t('common:password.hide')}
                {...createForm.register('password')}
              />
            </FormField>

            <FormField
              label={t('admin:verificationOfficers.confirmPasswordLabel')}
              htmlFor="officer-confirm-password"
              error={
                createForm.formState.errors.confirmPassword &&
                t(createForm.formState.errors.confirmPassword.message ?? '')
              }
            >
              <PasswordInput
                id="officer-confirm-password"
                autoComplete="new-password"
                showLabel={t('common:password.show')}
                hideLabel={t('common:password.hide')}
                {...createForm.register('confirmPassword')}
              />
            </FormField>
          </div>

          <p className="text-xs text-muted">{t('admin:verificationOfficers.createHint')}</p>

          {createMutation.isError && (
            <Alert tone="danger">
              {apiErrorMessage(t, 'admin', 'verificationOfficers', createMutation.error)}
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="submit" loading={createMutation.isPending}>
              {t('admin:verificationOfficers.createSubmit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                createForm.reset({ displayName: '', username: '', email: '', password: '', confirmPassword: '' })
                setCreateOpen(false)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
          </div>
        </form>
      )}

      {/* Shown exactly once. Held in component state only — never localStorage, sessionStorage or a URL. */}
      {credential && (
        <Alert tone="warning" title={t('admin:verificationOfficers.credentialOnceWarning')}>
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-foreground">
              {credential.username}
              {': '}
              <span className="font-mono font-semibold">{credential.temporaryPassword}</span>
            </p>
            <p className="text-sm text-foreground-secondary">
              {t('admin:verificationOfficers.credentialSignInHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(credential.temporaryPassword)}
              >
                {t('admin:verificationOfficers.copyCredential')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCredential(null)}>
                {t('admin:verificationOfficers.dismiss')}
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {resetMutation.isError && (
        <Alert tone="danger">
          {apiErrorMessage(t, 'admin', 'verificationOfficers', resetMutation.error)}
        </Alert>
      )}

      {officersQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : officersQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void officersQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : officers.length === 0 ? (
        <EmptyState
          title={t('admin:verificationOfficers.empty')}
          description={t('admin:verificationOfficers.emptyHint')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {officers.map((officer) => (
            <li
              key={officer.userId}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p
                  className={
                    officer.displayName
                      ? 'truncate font-medium text-foreground'
                      : 'truncate font-medium italic text-muted'
                  }
                >
                  {officer.displayName ?? t('admin:verificationOfficers.noName')}
                </p>
                <p className="truncate text-sm text-foreground-secondary">{officer.email}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {officer.username ?? t('admin:verificationOfficers.noUsername')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={officer.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {t(`admin:statusLabels.${officer.status}`)}
                </StatusBadge>
                {/*
                  Set for a legacy officer who has none, replace for everyone else — one control,
                  because the server treats both as the same replacement. There is no "clear name".
                */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    renameForm.reset({ displayName: officer.displayName ?? '' })
                    setRenaming(officer)
                  }}
                >
                  {officer.displayName
                    ? t('admin:verificationOfficers.editName')
                    : t('admin:verificationOfficers.setName')}
                </Button>
                {officer.username ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={resetMutation.isPending}
                    onClick={() => setResetting(officer)}
                  >
                    {t('admin:verificationOfficers.resetPassword')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      assignForm.reset({ username: '' })
                      setAssigningFor(officer)
                    }}
                  >
                    {t('admin:verificationOfficers.assignUsername')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {renaming && (
        <Card padding="lg" className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-foreground">
              {t('admin:verificationOfficers.editNameTitle', { holder: renaming.email })}
            </h3>
            <p className="text-sm text-foreground-secondary">
              {t('admin:verificationOfficers.editNameHint')}
            </p>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            noValidate
            onSubmit={renameForm.handleSubmit((values) => renameMutation.mutate(values))}
          >
            <FormField
              label={t('admin:verificationOfficers.displayNameLabel')}
              htmlFor="rename-officer-display-name"
              className="flex-1"
              error={
                renameForm.formState.errors.displayName &&
                t(renameForm.formState.errors.displayName.message ?? '')
              }
            >
              <Input
                id="rename-officer-display-name"
                type="text"
                autoComplete="off"
                {...renameForm.register('displayName')}
              />
            </FormField>
            <Button type="submit" loading={renameMutation.isPending}>
              {t('admin:verificationOfficers.saveName')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>
              {t('common:actions.cancel')}
            </Button>
          </form>
          {renameMutation.isError && (
            <Alert tone="danger">
              {apiErrorMessage(t, 'admin', 'verificationOfficers', renameMutation.error)}
            </Alert>
          )}
        </Card>
      )}

      {/* Assigning a username switches this account from email login to username login, so the
          dialog says so before it happens rather than after. */}
      {assigningFor && (
        <Card padding="lg" className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-foreground">
              {t('admin:verificationOfficers.assignUsernameTitle', {
                holder: assigningFor.displayName ?? assigningFor.email,
              })}
            </h3>
            <p className="text-sm text-foreground-secondary">
              {t('admin:verificationOfficers.assignUsernameWarning')}
            </p>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            noValidate
            onSubmit={assignForm.handleSubmit((values) => assignMutation.mutate(values))}
          >
            <FormField
              label={t('admin:verificationOfficers.usernameLabel')}
              htmlFor="assign-officer-username"
              className="flex-1"
              error={
                assignForm.formState.errors.username &&
                t(assignForm.formState.errors.username.message ?? '')
              }
            >
              <Input id="assign-officer-username" type="text" autoComplete="off" {...assignForm.register('username')} />
            </FormField>
            <Button type="submit" loading={assignMutation.isPending}>
              {t('admin:verificationOfficers.assignUsername')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAssigningFor(null)}>
              {t('common:actions.cancel')}
            </Button>
          </form>
          {assignMutation.isError && (
            <Alert tone="danger">
              {apiErrorMessage(t, 'admin', 'verificationOfficers', assignMutation.error)}
            </Alert>
          )}
        </Card>
      )}

      <ConfirmationDialog
        open={resetting !== null}
        onClose={() => setResetting(null)}
        onConfirm={() => resetting && resetMutation.mutate(resetting.userId)}
        closeLabel={t('common:actions.close')}
        title={t('admin:verificationOfficers.resetPasswordTitle')}
        description={t('admin:verificationOfficers.resetPasswordDescription', {
          holder: resetting?.displayName ?? resetting?.email ?? '',
        })}
        confirmLabel={t('admin:verificationOfficers.resetPassword')}
        cancelLabel={t('common:actions.cancel')}
        destructive
        loading={resetMutation.isPending}
      />
    </Card>
  )
}
