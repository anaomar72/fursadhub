import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { createStaffSchema, type CreateStaffFormValues } from '../schemas/createStaffSchema'
import { changeStaffRoleSchema, type ChangeStaffRoleFormValues } from '../schemas/changeStaffRoleSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  Icon,
  Input,
  LoadingState,
  PageHeader,
  PasswordInput,
  Select,
  StatusBadge,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import type { StatusTone } from '../../../components/ui'
import type { DepartmentResponse, StaffMemberResponse, TemporaryCredentialResponse, UserAccountStatus } from '../types'

/** Exactly the two roles a University Admin may assign (CLAUDE.md section 26A; UniversityStaffService). */
const ROLES: CreateStaffFormValues['role'][] = ['DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR']

const STATUS_TONE: Record<UserAccountStatus, StatusTone> = {
  PENDING_CONTACT_VERIFICATION: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  CLOSED: 'neutral',
}

/**
 * Managed staff provisioning for a university (CLAUDE.md section 26A).
 *
 * <p>This drives the real production endpoints — no seed data, no local-only accounts: the admin
 * types the initial password and its confirmation, the server enforces the password policy and
 * creates the User + membership + department scope atomically, and the new staff member then signs
 * in through the ordinary login page.
 *
 * <p>The scope model is exactly one thing — a set of this university's departments — because that
 * is the only scope the backend stores. Both assignable roles require at least one
 * ({@code STAFF_SCOPE_REQUIRED}), which is why the department picker is never optional here.
 */
export function StaffPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const queryClient = useQueryClient()
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null)
  const [credential, setCredential] = useState<TemporaryCredentialResponse | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const staffQuery = useQuery({ queryKey: ['university', 'staff', universityId], queryFn: () => universityApi.listStaff(universityId) })
  const departmentsQuery = useQuery({ queryKey: ['departments', universityId], queryFn: () => universityApi.listDepartments(universityId) })

  const form = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { email: '', username: '', password: '', confirmPassword: '', role: 'DEPARTMENT_COORDINATOR', departmentIds: [] },
  })

  const invalidateStaff = () => queryClient.invalidateQueries({ queryKey: ['university', 'staff', universityId] })

  const createMutation = useMutation({
    mutationFn: (values: CreateStaffFormValues) => universityApi.createStaff(universityId, values),
    onSuccess: () => {
      // The admin already knows the password they typed, so nothing is echoed back — the form is
      // simply cleared, which also drops it from browser form state (CLAUDE.md section 26A).
      form.reset({ email: '', password: '', confirmPassword: '', role: 'DEPARTMENT_COORDINATOR', departmentIds: [] })
      setCreateOpen(false)
      invalidateStaff()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (membershipId: string) => universityApi.revokeStaff(universityId, membershipId),
    onSuccess: invalidateStaff,
  })
  const suspendMutation = useMutation({
    mutationFn: (membershipId: string) => universityApi.suspendStaff(universityId, membershipId),
    onSuccess: invalidateStaff,
  })
  const reactivateMutation = useMutation({
    mutationFn: (membershipId: string) => universityApi.reactivateStaff(universityId, membershipId),
    onSuccess: invalidateStaff,
  })
  const resetPasswordMutation = useMutation({
    mutationFn: (membershipId: string) => universityApi.resetStaffPassword(universityId, membershipId),
    onSuccess: (result) => setCredential(result),
  })

  const departments = departmentsQuery.data ?? []
  const staff = staffQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('university:staff.title')}
        description={t('university:staff.subtitle')}
        actions={
          <Button type="button" onClick={() => setCreateOpen((open) => !open)}>
            <Icon name={createOpen ? 'close' : 'users'} className="size-4" />
            {createOpen ? t('university:departments.cancel') : t('university:staff.addStaff')}
          </Button>
        }
      />

      {departments.length === 0 && !departmentsQuery.isLoading && (
        <Alert tone="warning" title={t('university:staff.noDepartmentsTitle')}>
          {t('university:staff.noDepartmentsBody')}
        </Alert>
      )}

      {createOpen && (
        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('university:staff.createTitle')}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('university:staff.createHint')}</p>

          <form
            className="mt-5 flex flex-col gap-4"
            noValidate
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t('university:staff.emailLabel')}
                htmlFor="staff-email"
                className="sm:col-span-2"
                error={form.formState.errors.email && t(form.formState.errors.email.message ?? '')}
              >
                <Input id="staff-email" type="email" autoComplete="off" {...form.register('email')} />
              </FormField>

              {/* Backend Phase B5.5: the login identifier for this managed account. */}
              <FormField
                label={t('university:staff.usernameLabel')}
                htmlFor="staff-username"
                className="sm:col-span-2"
                hint={t('university:staff.usernameHint')}
                error={form.formState.errors.username && t(form.formState.errors.username.message ?? '')}
              >
                <Input id="staff-username" type="text" autoComplete="off" {...form.register('username')} />
              </FormField>

              <FormField
                label={t('university:staff.passwordLabel')}
                htmlFor="staff-password"
                error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
              >
                <PasswordInput
                  id="staff-password"
                  autoComplete="new-password"
                  showLabel={t('common:password.show')}
                  hideLabel={t('common:password.hide')}
                  {...form.register('password')}
                />
              </FormField>

              <FormField
                label={t('university:staff.confirmPasswordLabel')}
                htmlFor="staff-confirm-password"
                error={form.formState.errors.confirmPassword && t(form.formState.errors.confirmPassword.message ?? '')}
              >
                <PasswordInput
                  id="staff-confirm-password"
                  autoComplete="new-password"
                  showLabel={t('common:password.show')}
                  hideLabel={t('common:password.hide')}
                  {...form.register('confirmPassword')}
                />
              </FormField>

              <FormField label={t('university:staff.roleLabel')} htmlFor="staff-role">
                <Select id="staff-role" {...form.register('role')}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`university:staff.roles.${role}`)}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <DepartmentScopeField
              idPrefix="create"
              departments={departments}
              register={form.register('departmentIds')}
              error={form.formState.errors.departmentIds && t(form.formState.errors.departmentIds.message ?? '')}
            />

            {createMutation.isError && (
              <p className="text-sm text-danger" role="alert">
                {apiErrorMessage(t, 'university', 'staff', createMutation.error)}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={createMutation.isPending} disabled={departments.length === 0}>
                {t('university:staff.createSubmit')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                {t('university:departments.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Shown exactly once, then discarded — the API never returns it again. */}
      {credential && (
        <Alert tone="warning" title={t('university:staff.resetPasswordOnceWarning')}>
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-foreground">
              {credential.email}
              {': '}
              <span className="font-mono font-semibold">{credential.temporaryPassword}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(credential.temporaryPassword)}
              >
                {t('university:staff.copyCredentials')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCredential(null)}>
                {t('university:staff.dismiss')}
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {staffQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : staff.length === 0 ? (
        <EmptyState title={t('university:staff.empty')} description={t('university:staff.emptyHint')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {staff.map((member) => (
            <li key={member.membershipId}>
              <StaffRow
                member={member}
                departments={departments}
                isEditing={editingMembershipId === member.membershipId}
                onToggleEdit={() =>
                  setEditingMembershipId((current) => (current === member.membershipId ? null : member.membershipId))
                }
                onEditSaved={() => {
                  setEditingMembershipId(null)
                  invalidateStaff()
                }}
                onRevoke={() => revokeMutation.mutate(member.membershipId)}
                onSuspend={() => suspendMutation.mutate(member.membershipId)}
                onReactivate={() => reactivateMutation.mutate(member.membershipId)}
                onResetPassword={() => resetPasswordMutation.mutate(member.membershipId)}
                resetPasswordPending={resetPasswordMutation.isPending}
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

/**
 * The one scope control in the university area. Checkboxes rather than a native multi-select: a
 * `<select multiple>` hides how many are chosen and is close to unusable on a phone, and the value
 * shape RHF collects is identical.
 */
function DepartmentScopeField({
  idPrefix,
  departments,
  register,
  error,
}: {
  idPrefix: string
  departments: DepartmentResponse[]
  register: UseFormRegisterReturn
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{t('university:staff.departmentsLabel')}</legend>
      <p className="mt-0.5 text-xs text-foreground-secondary">{t('university:staff.departmentsHint')}</p>
      <div className="mt-2 grid gap-2 rounded-md border border-border bg-surface-muted p-3 sm:grid-cols-2">
        {departments.map((department) => (
          <Checkbox
            key={department.id}
            id={`${idPrefix}-dept-${department.id}`}
            value={department.id}
            label={department.name}
            {...register}
          />
        ))}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}

interface StaffRowProps {
  member: StaffMemberResponse
  departments: DepartmentResponse[]
  isEditing: boolean
  onToggleEdit: () => void
  onEditSaved: () => void
  onRevoke: () => void
  onSuspend: () => void
  onReactivate: () => void
  onResetPassword: () => void
  resetPasswordPending: boolean
}

function StaffRow({
  member,
  departments,
  isEditing,
  onToggleEdit,
  onEditSaved,
  onRevoke,
  onSuspend,
  onReactivate,
  onResetPassword,
  resetPasswordPending,
}: StaffRowProps) {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()

  const editForm = useForm<ChangeStaffRoleFormValues>({
    resolver: zodResolver(changeStaffRoleSchema),
    defaultValues: {
      role: member.role === 'UNIVERSITY_ADMIN' ? 'DEPARTMENT_COORDINATOR' : member.role,
      departmentIds: member.departmentIds,
    },
  })

  const changeRoleMutation = useMutation({
    mutationFn: (values: ChangeStaffRoleFormValues) => universityApi.changeStaffRole(universityId, member.membershipId, values),
    onSuccess: onEditSaved,
  })

  const scopeNames = member.departmentIds
    .map((id) => departments.find((department) => department.id === id)?.name ?? id)
    .join(', ')

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info">
            <Icon name="user" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{member.email}</p>
            <p className="mt-0.5 text-sm text-foreground-secondary">{t(`university:staff.roles.${member.role}`)}</p>
            {scopeNames && (
              <p className="mt-1 text-xs text-muted">{t('university:staff.scopeSummary', { departments: scopeNames })}</p>
            )}
          </div>
        </div>
        {member.status && (
          <StatusBadge tone={STATUS_TONE[member.status]}>
            {t(`university:staff.statusValues.${member.status}`)}
          </StatusBadge>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button type="button" size="sm" variant="outline" onClick={onToggleEdit}>
          {t('university:staff.changeRole')}
        </Button>
        {member.status === 'SUSPENDED' ? (
          <Button type="button" size="sm" variant="outline" onClick={onReactivate}>
            {t('university:staff.reactivate')}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={onSuspend}>
            {t('university:staff.suspend')}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={onResetPassword} loading={resetPasswordPending}>
          {t('university:staff.resetPassword')}
        </Button>
        <button
          type="button"
          onClick={onRevoke}
          className="ml-auto rounded-md px-2 py-1 text-sm font-semibold text-danger transition-colors hover:bg-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
        >
          {t('university:staff.revoke')}
        </button>
      </div>

      {isEditing && (
        <form
          className="mt-4 flex flex-col gap-4 rounded-md border border-border bg-surface-muted p-4"
          noValidate
          onSubmit={editForm.handleSubmit((values) => changeRoleMutation.mutate(values))}
        >
          <FormField label={t('university:staff.roleLabel')} htmlFor={`role-${member.membershipId}`} className="sm:max-w-xs">
            <Select id={`role-${member.membershipId}`} {...editForm.register('role')}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`university:staff.roles.${role}`)}
                </option>
              ))}
            </Select>
          </FormField>

          <DepartmentScopeField
            idPrefix={member.membershipId}
            departments={departments}
            register={editForm.register('departmentIds')}
            error={editForm.formState.errors.departmentIds && t(editForm.formState.errors.departmentIds.message ?? '')}
          />

          {changeRoleMutation.isError && (
            <p className="text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'university', 'staff', changeRoleMutation.error)}
            </p>
          )}

          <div>
            <Button type="submit" size="sm" loading={changeRoleMutation.isPending}>
              {t('university:staff.saveRole')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
