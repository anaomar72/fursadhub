import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { ASSIGNABLE_ORGANIZATION_ROLES, organizationCapabilities } from '../organizationCapabilities'
import { createMemberSchema, type CreateMemberFormValues } from '../schemas/createMemberSchema'
import {
  StaffActionFeedbackAlert,
  StaffIdentity,
  StaffIdentityControls,
  staffName,
  useStaffActionFeedback,
  type ConfirmedStaffCommand,
} from '../../../components/staff'
import { changeMemberRoleSchema, type ChangeMemberRoleFormValues } from '../schemas/changeMemberRoleSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Alert,
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  FilterBar,
  FormField,
  Icon,
  Input,
  SkeletonList,
  PageHeader,
  PasswordInput,
  Select,
  StatusBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import type {
  OrganizationMemberResponse,
  OrganizationRole,
  TemporaryCredentialResponse,
} from '../types'
import { ACCOUNT_STATUS_TONE } from '../../../lib/status/statusTones'

const ROLE_FILTERS: (OrganizationRole | '')[] = ['', 'ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR']

/**
 * Managed staff provisioning for an organization (CLAUDE.md section 26A).
 *
 * <p>This drives the real production endpoints — no seed data, no local-only accounts: the admin
 * types the initial password and its confirmation, the server enforces the password policy and
 * creates the User + membership atomically, and the new staff member then signs in through the
 * ordinary login page. There is no separate staff login and no verification email, because the
 * creating admin is vouching for the address directly.
 *
 * <p>There is deliberately NO scope control here. An organization membership carries a role and
 * nothing else — unlike a university coordinator's assigned departments, the backend stores no
 * organization-side resource scope. The one narrowing that exists is an
 * {@code ORGANIZATION_SUPERVISOR}'s active placement assignments, and those are made on the
 * placement, not on the account, which is why this page links there instead of inventing a picker.
 *
 * <p>Only {@code RECRUITER} and {@code ORGANIZATION_SUPERVISOR} can be assigned:
 * {@code OrganizationMembershipService.ASSIGNABLE_ROLES} refuses anything else, most importantly
 * another {@code ORGANIZATION_ADMIN}.
 */
export function StaffPage() {
  const { t } = useTranslation()
  const membership = useOrganizationMembership()
  const { organizationId } = membership
  // The backend lets ANY member of the organization READ this list
  // (OrganizationMembershipService line ~205: requireMembership with no role), while every
  // mutation on it requires ORGANIZATION_ADMIN. So a recruiter or supervisor who reaches this URL
  // directly gets a legitimate roster — but must not be offered create/role/suspend/reset/revoke
  // controls that would only ever come back 403.
  const canManageStaff = organizationCapabilities(membership).canManageStaff
  const queryClient = useQueryClient()
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null)
  const [credential, setCredential] = useState<TemporaryCredentialResponse | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>('')

  const membersQuery = useQuery({
    queryKey: ['organization', 'members', organizationId],
    queryFn: () => organizationApi.listMembers(organizationId),
  })

  // Supervisors are meaningful only through their placement assignments, so the row for one shows
  // how many they currently hold. Read from the placement list the admin can already see.
  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(organizationId),
  })

  const assignmentsByEmail = new Map<string, number>()
  for (const placement of placementsQuery.data ?? []) {
    const email = placement.organizationSupervisor?.supervisorEmail
    if (placement.organizationSupervisor?.active && email) {
      assignmentsByEmail.set(email, (assignmentsByEmail.get(email) ?? 0) + 1)
    }
  }

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { displayName: '', email: '', username: '', password: '', confirmPassword: '', role: 'RECRUITER' },
  })

  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ['organization', 'members', organizationId] })

  const createMutation = useMutation({
    mutationFn: ({ displayName, ...values }: CreateMemberFormValues) =>
      organizationApi.createMember(organizationId, {
        ...values,
        // Omitted rather than sent as '': Backend Phase B5 makes displayName optional, and an empty
        // string is not a name the admin chose to give.
        ...(displayName?.trim() ? { displayName: displayName.trim() } : {}),
      }),
    onSuccess: () => {
      // The admin already knows the password they typed, so nothing is echoed back — the form is
      // cleared, which also drops it from browser form state (CLAUDE.md section 26A).
      form.reset({ displayName: '', email: '', username: '', password: '', confirmPassword: '', role: 'RECRUITER' })
      setCreateOpen(false)
      void invalidateMembers()
    },
  })

  // Every lifecycle command reports its outcome; none of them may fail silently.
  const actionFeedback = useStaffActionFeedback('organization')
  const revokeMutation = useMutation({
    mutationFn: (member: OrganizationMemberResponse) => organizationApi.revokeMember(organizationId, member.membershipId),
    onMutate: actionFeedback.clear,
    onSuccess: (_result, member) => {
      actionFeedback.succeeded('revoke', member)
      return invalidateMembers()
    },
    onError: (error, member) => actionFeedback.failed('revoke', member, error),
  })
  const suspendMutation = useMutation({
    mutationFn: (member: OrganizationMemberResponse) => organizationApi.suspendMember(organizationId, member.membershipId),
    onMutate: actionFeedback.clear,
    onSuccess: (_result, member) => {
      actionFeedback.succeeded('suspend', member)
      return invalidateMembers()
    },
    onError: (error, member) => actionFeedback.failed('suspend', member, error),
  })
  const reactivateMutation = useMutation({
    mutationFn: (member: OrganizationMemberResponse) => organizationApi.reactivateMember(organizationId, member.membershipId),
    onMutate: actionFeedback.clear,
    onSuccess: (_result, member) => {
      actionFeedback.succeeded('reactivate', member)
      return invalidateMembers()
    },
    onError: (error, member) => actionFeedback.failed('reactivate', member, error),
  })
  const resetPasswordMutation = useMutation({
    mutationFn: (member: OrganizationMemberResponse) => organizationApi.resetMemberPassword(organizationId, member.membershipId),
    onMutate: actionFeedback.clear,
    // The one-time credential panel is the success message.
    onSuccess: (result) => setCredential(result),
    onError: (error, member) => actionFeedback.failed('resetPassword', member, error),
  })

  // Suspend, reset and revoke each lock a real person out (sessions revoked, password invalidated,
  // or access removed for good), so each is confirmed with what it will do before it runs.
  const [confirming, setConfirming] = useState<{ command: ConfirmedStaffCommand; member: OrganizationMemberResponse } | null>(null)
  const confirmedCommands = { suspend: suspendMutation, resetPassword: resetPasswordMutation, revoke: revokeMutation }
  const confirmingMutation = confirming ? confirmedCommands[confirming.command] : null

  const members = (membersQuery.data ?? []).filter((member) => !roleFilter || member.role === roleFilter)

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('organization:staff.title')}
        description={t('organization:staff.subtitle')}
        actions={
          canManageStaff ? (
            <Button type="button" onClick={() => setCreateOpen((open) => !open)}>
              <Icon name={createOpen ? 'close' : 'users'} className="size-4" />
              {createOpen ? t('common:actions.cancel') : t('organization:staff.addStaff')}
            </Button>
          ) : undefined
        }
      />

      {createOpen && (
        <Card padding="lg">
          <h2 className="font-display text-title-panel text-foreground">
            {t('organization:staff.createTitle')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('organization:staff.createHint')}</p>

          <form
            className="mt-5 flex flex-col gap-4"
            noValidate
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Backend Phase B5. Optional server-side: omitting it creates an account with no
                  display name, which the roster then shows by email. */}
              <FormField
                label={t('organization:staff.displayNameLabel')}
                htmlFor="org-staff-display-name"
                className="sm:col-span-2"
                hint={t('organization:staff.displayNameHint')}
                error={form.formState.errors.displayName && t(form.formState.errors.displayName.message ?? '')}
              >
                <Input id="org-staff-display-name" type="text" autoComplete="off" {...form.register('displayName')} />
              </FormField>

              <FormField
                label={t('organization:staff.emailLabel')}
                htmlFor="org-staff-email"
                className="sm:col-span-2"
                error={form.formState.errors.email && t(form.formState.errors.email.message ?? '')}
              >
                <Input id="org-staff-email" type="email" autoComplete="off" {...form.register('email')} />
              </FormField>

              {/* Backend Phase B5.5: the login identifier for this managed account. */}
              <FormField
                label={t('organization:staff.usernameLabel')}
                htmlFor="org-staff-username"
                className="sm:col-span-2"
                hint={t('organization:staff.usernameHint')}
                error={form.formState.errors.username && t(form.formState.errors.username.message ?? '')}
              >
                <Input id="org-staff-username" type="text" autoComplete="off" {...form.register('username')} />
              </FormField>

              <FormField
                label={t('organization:staff.passwordLabel')}
                htmlFor="org-staff-password"
                error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
              >
                <PasswordInput
                  id="org-staff-password"
                  autoComplete="new-password"
                  showLabel={t('common:password.show')}
                  hideLabel={t('common:password.hide')}
                  {...form.register('password')}
                />
              </FormField>

              <FormField
                label={t('organization:staff.confirmPasswordLabel')}
                htmlFor="org-staff-confirm-password"
                error={form.formState.errors.confirmPassword && t(form.formState.errors.confirmPassword.message ?? '')}
              >
                <PasswordInput
                  id="org-staff-confirm-password"
                  autoComplete="new-password"
                  showLabel={t('common:password.show')}
                  hideLabel={t('common:password.hide')}
                  {...form.register('confirmPassword')}
                />
              </FormField>

              <FormField
                label={t('organization:staff.roleLabel')}
                htmlFor="org-staff-role"
                hint={t('organization:staff.roleHint')}
              >
                <Select id="org-staff-role" {...form.register('role')}>
                  {ASSIGNABLE_ORGANIZATION_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`organization:staff.roles.${role}`)}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            {createMutation.isError && (
              <Alert tone="danger">{apiErrorMessage(t, 'organization', 'staff', createMutation.error)}</Alert>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="submit" loading={createMutation.isPending}>
                {t('organization:staff.createSubmit')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Shown exactly once, then discarded — the API never returns it again. */}
      <StaffActionFeedbackAlert feedback={actionFeedback.feedback} onDismiss={actionFeedback.clear} />

      {credential && (
        <Alert tone="warning" title={t('organization:staff.resetPasswordOnceWarning')}>
          <div className="mt-2 flex flex-col gap-3">
            <dl className="grid gap-1 text-sm">
              <div className="flex flex-wrap gap-2">
                <dt className="text-foreground-secondary">{t('organization:staff.usernameReadOnly')}</dt>
                {/* A legacy account with no username still signs in by email — show whichever
                    credential this account actually uses, never both as if either worked. */}
                <dd className="font-mono font-semibold text-foreground">{credential.username ?? credential.email}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-foreground-secondary">{t('organization:staff.passwordLabel')}</dt>
                <dd className="font-mono font-semibold text-foreground">{credential.temporaryPassword}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(credential.temporaryPassword)}
              >
                {t('organization:staff.copyCredentials')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCredential(null)}>
                {t('organization:staff.dismiss')}
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <FilterBar>
        <Select
          aria-label={t('organization:staff.roleLabel')}
          className="sm:w-60"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          {ROLE_FILTERS.map((role) => (
            <option key={role || 'ALL'} value={role}>
              {role ? t(`organization:staff.roles.${role}`) : t('organization:staff.allRoles')}
            </option>
          ))}
        </Select>
      </FilterBar>

      {membersQuery.isLoading ? (
        <SkeletonList rows={4} />
      ) : members.length === 0 ? (
        <EmptyState title={t('organization:staff.empty')} description={t('organization:staff.emptyHint')} />
      ) : (
        // Phase 6: one roster surface, a row per member, instead of a bordered card each.
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {members.map((member) => (
            <li key={member.membershipId}>
              <MemberRow
                member={member}
                assignedPlacementCount={member.email ? (assignmentsByEmail.get(member.email) ?? 0) : 0}
                canManageStaff={canManageStaff}
                isEditing={editingMembershipId === member.membershipId}
                onToggleEdit={() =>
                  setEditingMembershipId((current) => (current === member.membershipId ? null : member.membershipId))
                }
                onEditSaved={() => {
                  setEditingMembershipId(null)
                  void invalidateMembers()
                }}
                onRevoke={() => setConfirming({ command: 'revoke', member })}
                onSuspend={() => setConfirming({ command: 'suspend', member })}
                onReactivate={() => reactivateMutation.mutate(member)}
                onResetPassword={() => setConfirming({ command: 'resetPassword', member })}
                resetPasswordPending={resetPasswordMutation.isPending}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmationDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return
          confirmedCommands[confirming.command].mutate(confirming.member, {
            onSettled: () => setConfirming(null),
          })
        }}
        closeLabel={t('common:actions.close')}
        title={
          confirming
            ? t(`organization:staff.confirm.${confirming.command}Title`, { name: staffName(confirming.member) })
            : ''
        }
        description={confirming ? t(`organization:staff.confirm.${confirming.command}Body`) : ''}
        confirmLabel={confirming ? t(`organization:staff.${confirming.command}`) : undefined}
        destructive
        loading={confirmingMutation?.isPending ?? false}
      />
    </PageContainer>
  )
}

interface MemberRowProps {
  member: OrganizationMemberResponse
  assignedPlacementCount: number
  /** False for a recruiter/supervisor who reached this page directly — read-only roster, no controls. */
  canManageStaff: boolean
  isEditing: boolean
  onToggleEdit: () => void
  onEditSaved: () => void
  onRevoke: () => void
  onSuspend: () => void
  onReactivate: () => void
  onResetPassword: () => void
  resetPasswordPending: boolean
}

function MemberRow({
  member,
  assignedPlacementCount,
  canManageStaff,
  isEditing,
  onToggleEdit,
  onEditSaved,
  onRevoke,
  onSuspend,
  onReactivate,
  onResetPassword,
  resetPasswordPending,
}: MemberRowProps) {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()

  const editForm = useForm<ChangeMemberRoleFormValues>({
    resolver: zodResolver(changeMemberRoleSchema),
    defaultValues: { role: member.role === 'ORGANIZATION_ADMIN' ? 'RECRUITER' : member.role },
  })

  const changeRoleMutation = useMutation({
    mutationFn: (values: ChangeMemberRoleFormValues) =>
      organizationApi.changeMemberRole(organizationId, member.membershipId, values),
    onSuccess: onEditSaved,
  })

  // The founding admin is not a managed staff account. The identity commands genuinely refuse one —
  // changeDisplayName and assignUsername both call requireAssignableRole on the membership's CURRENT
  // role. The lifecycle commands (role, suspend, reset, revoke) do NOT, so hiding those here is this
  // page's own conservatism rather than a mirror of the server: an admin should not be handed a
  // one-click path to lock their own organization out of its administration.
  const isAdmin = member.role === 'ORGANIZATION_ADMIN'

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue dark:bg-info-bg dark:text-info">
            <Icon name="user" className="size-5" />
          </span>
          <StaffIdentity
            displayName={member.displayName}
            email={member.email}
            username={member.username}
            noDisplayNameLabel={t('organization:staff.noDisplayName')}
            noUsernameLabel={t('organization:staff.noUsername')}
          >
            <p className="mt-1 text-sm text-foreground-secondary">{t(`organization:staff.roles.${member.role}`)}</p>
            {member.role === 'ORGANIZATION_SUPERVISOR' && (
              <p className="mt-1 text-xs text-muted">
                {t('organization:staff.assignedPlacements', { count: assignedPlacementCount })}
              </p>
            )}
          </StaffIdentity>
        </div>
        {member.status && (
          <StatusBadge tone={ACCOUNT_STATUS_TONE[member.status]}>
            {t(`organization:staff.statusValues.${member.status}`)}
          </StatusBadge>
        )}
      </div>

      {/* Identity commands (Backend Phase B5/B5.5). Managed staff only: the server refuses an
          ORGANIZATION_ADMIN membership with STAFF_ROLE_NOT_ASSIGNABLE, so the founder's row offers
          nothing that would fail. */}
      {!isAdmin && canManageStaff && (
        <div className="mt-4 border-t border-border pt-4">
          <StaffIdentityControls
            namespace="organization"
            currentDisplayName={member.displayName}
            currentUsername={member.username}
            idPrefix={`org-staff-${member.membershipId}`}
            onAssignUsername={(username) =>
              organizationApi.assignMemberUsername(organizationId, member.membershipId, username)
            }
            onChangeDisplayName={(displayName) =>
              organizationApi.changeMemberDisplayName(organizationId, member.membershipId, displayName)
            }
            onSaved={onEditSaved}
          />
        </div>
      )}

      {!isAdmin && canManageStaff && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="button" size="sm" variant="outline" onClick={onToggleEdit}>
            {t('organization:staff.changeRole')}
          </Button>
          {member.status === 'SUSPENDED' ? (
            <Button type="button" size="sm" variant="outline" onClick={onReactivate}>
              {t('organization:staff.reactivate')}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={onSuspend}>
              {t('organization:staff.suspend')}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={onResetPassword} loading={resetPasswordPending}>
            {t('organization:staff.resetPassword')}
          </Button>
          <button
            type="button"
            onClick={onRevoke}
            className="ml-auto rounded-md px-2 py-1 text-sm font-semibold text-danger transition-colors hover:bg-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
          >
            {t('organization:staff.revoke')}
          </button>
        </div>
      )}

      {isEditing && !isAdmin && (
        <form
          className="mt-4 flex flex-col gap-4 rounded-md border border-border bg-surface-muted p-4"
          noValidate
          onSubmit={editForm.handleSubmit((values) => changeRoleMutation.mutate(values))}
        >
          <FormField
            label={t('organization:staff.roleLabel')}
            htmlFor={`role-${member.membershipId}`}
            className="sm:max-w-xs"
            hint={t('organization:staff.roleHint')}
          >
            <Select id={`role-${member.membershipId}`} {...editForm.register('role')}>
              {ASSIGNABLE_ORGANIZATION_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`organization:staff.roles.${role}`)}
                </option>
              ))}
            </Select>
          </FormField>

          {changeRoleMutation.isError && (
            <Alert tone="danger">{apiErrorMessage(t, 'organization', 'staff', changeRoleMutation.error)}</Alert>
          )}

          <div>
            <Button type="submit" size="sm" loading={changeRoleMutation.isPending}>
              {t('organization:staff.saveRole')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
