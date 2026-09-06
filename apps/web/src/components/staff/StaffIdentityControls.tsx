import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { usernameSchema } from '../../lib/validation/username'
import { apiErrorMessage } from '../../lib/api/errorMessage'
import { Alert, Button, FormField, Input } from '../ui'

const assignUsernameSchema = z.object({ username: usernameSchema })
type AssignUsernameValues = z.infer<typeof assignUsernameSchema>

const displayNameSchema = z.object({
  displayName: z.string().trim().max(255, 'validation:field.tooLong'),
})
type DisplayNameValues = z.infer<typeof displayNameSchema>

export interface StaffIdentityControlsProps {
  /** Namespace for error copy — `organization` or `university`. */
  namespace: 'organization' | 'university'
  currentDisplayName: string | null
  currentUsername: string | null
  /** Called with the chosen username. Permanent — the caller wires the B5.5 endpoint. */
  onAssignUsername: (username: string) => Promise<unknown>
  /** Called with the new name, or null to clear it. The caller wires the B5 endpoint. */
  onChangeDisplayName: (displayName: string | null) => Promise<unknown>
  onSaved: () => void
  /** A field id prefix, so several rows on one page keep distinct labels. */
  idPrefix: string
}

/**
 * The Backend Phase B5 / B5.5 identity commands for ONE managed staff member.
 *
 * <p>Shared by both tenant portals because the two contracts are the same shape — a display-name
 * command and a one-time username assignment — and the only difference is which endpoint the caller
 * hands in. A second copy would be a second place for the "no rename" rule to be forgotten.
 *
 * <p><strong>Username assignment appears only while `currentUsername` is null.</strong> B5.5 makes
 * it permanent: once assigned, the account signs in by username and its email stops working as a
 * credential, and the server answers a second attempt with `USERNAME_IMMUTABLE`. So an account that
 * has one shows it read-only, with no rename control anywhere — offering an edit for a field the
 * server will refuse is the failure this is written to avoid.
 */
export function StaffIdentityControls({
  namespace,
  currentDisplayName,
  currentUsername,
  onAssignUsername,
  onChangeDisplayName,
  onSaved,
  idPrefix,
}: StaffIdentityControlsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<'username' | 'displayName' | null>(null)

  const usernameForm = useForm<AssignUsernameValues>({
    resolver: zodResolver(assignUsernameSchema),
    defaultValues: { username: '' },
  })
  const displayNameForm = useForm<DisplayNameValues>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: currentDisplayName ?? '' },
  })

  const assignUsernameMutation = useMutation({
    mutationFn: (values: AssignUsernameValues) => onAssignUsername(values.username),
    onSuccess: () => {
      setOpen(null)
      usernameForm.reset({ username: '' })
      onSaved()
    },
  })

  const displayNameMutation = useMutation({
    // An emptied field CLEARS the name — the B5 command takes an explicit null for exactly that,
    // and sending '' would store an empty string masquerading as a name.
    mutationFn: (values: DisplayNameValues) => onChangeDisplayName(values.displayName.trim() || null),
    onSuccess: () => {
      setOpen(null)
      onSaved()
    },
  })

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(open === 'displayName' ? null : 'displayName')}>
          {t(`${namespace}:staff.changeDisplayName`)}
        </Button>
        {/* No rename control when one already exists — the server refuses it (USERNAME_IMMUTABLE). */}
        {!currentUsername && (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(open === 'username' ? null : 'username')}>
            {t(`${namespace}:staff.assignUsername`)}
          </Button>
        )}
      </div>

      {open === 'displayName' && (
        <form
          className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-4"
          noValidate
          onSubmit={displayNameForm.handleSubmit((values) => displayNameMutation.mutate(values))}
        >
          <h4 className="text-sm font-semibold text-foreground">{t(`${namespace}:staff.changeDisplayNameTitle`)}</h4>
          <FormField
            label={t(`${namespace}:staff.displayNameLabel`)}
            htmlFor={`${idPrefix}-display-name`}
            hint={t(`${namespace}:staff.displayNameHint`)}
            error={displayNameForm.formState.errors.displayName && t(displayNameForm.formState.errors.displayName.message ?? '')}
          >
            <Input id={`${idPrefix}-display-name`} maxLength={255} {...displayNameForm.register('displayName')} />
          </FormField>

          {displayNameMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, namespace, 'staff', displayNameMutation.error)}</Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={displayNameMutation.isPending}>
              {t(`${namespace}:staff.saveDisplayName`)}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(null)}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </form>
      )}

      {open === 'username' && !currentUsername && (
        <form
          className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-4"
          noValidate
          onSubmit={usernameForm.handleSubmit((values) => assignUsernameMutation.mutate(values))}
        >
          <h4 className="text-sm font-semibold text-foreground">{t(`${namespace}:staff.assignUsernameTitle`)}</h4>
          <FormField
            label={t(`${namespace}:staff.usernameLabel`)}
            htmlFor={`${idPrefix}-username`}
            hint={t(`${namespace}:staff.assignUsernameHint`)}
            error={usernameForm.formState.errors.username && t(usernameForm.formState.errors.username.message ?? '')}
          >
            <Input id={`${idPrefix}-username`} autoComplete="off" {...usernameForm.register('username')} />
          </FormField>

          {assignUsernameMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, namespace, 'staff', assignUsernameMutation.error)}</Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={assignUsernameMutation.isPending}>
              {t(`${namespace}:staff.assignUsernameSubmit`)}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(null)}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </form>
      )}
    </>
  )
}
