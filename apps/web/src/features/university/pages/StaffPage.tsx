import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { createStaffSchema, type CreateStaffFormValues } from '../schemas/createStaffSchema'
import { changeStaffRoleSchema, type ChangeStaffRoleFormValues } from '../schemas/changeStaffRoleSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, EmptyState, FormField, Input, LoadingSpinner, PageHeader, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import type { StaffMemberResponse, TemporaryCredentialResponse, UserAccountStatus } from '../types'

const ROLES: CreateStaffFormValues['role'][] = ['DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR']

const STATUS_TONE: Record<UserAccountStatus, StatusTone> = {
  PENDING_CONTACT_VERIFICATION: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  CLOSED: 'neutral',
}

export function StaffPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const queryClient = useQueryClient()
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null)
  const [credential, setCredential] = useState<TemporaryCredentialResponse | null>(null)

  const staffQuery = useQuery({ queryKey: ['university', 'staff', universityId], queryFn: () => universityApi.listStaff(universityId) })
  const departmentsQuery = useQuery({ queryKey: ['departments', universityId], queryFn: () => universityApi.listDepartments(universityId) })

  const form = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', role: 'DEPARTMENT_COORDINATOR', departmentIds: [] },
  })

  const invalidateStaff = () => queryClient.invalidateQueries({ queryKey: ['university', 'staff', universityId] })

  const createMutation = useMutation({
    mutationFn: (values: CreateStaffFormValues) => universityApi.createStaff(universityId, values),
    onSuccess: () => {
      form.reset({ email: '', password: '', confirmPassword: '', role: 'DEPARTMENT_COORDINATOR', departmentIds: [] })
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('university:staff.title')} />

      <form
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        noValidate
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <FormField
          label={t('university:staff.emailLabel')}
          htmlFor="staff-email"
          error={form.formState.errors.email && t(form.formState.errors.email.message ?? '')}
        >
          <Input id="staff-email" type="email" {...form.register('email')} />
        </FormField>

        <FormField
          label={t('university:staff.passwordLabel')}
          htmlFor="staff-password"
          error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
        >
          <Input id="staff-password" type="password" autoComplete="new-password" {...form.register('password')} />
        </FormField>

        <FormField
          label={t('university:staff.confirmPasswordLabel')}
          htmlFor="staff-confirm-password"
          error={form.formState.errors.confirmPassword && t(form.formState.errors.confirmPassword.message ?? '')}
        >
          <Input id="staff-confirm-password" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
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

        <FormField
          label={t('university:staff.departmentsLabel')}
          htmlFor="staff-departments"
          error={form.formState.errors.departmentIds && t(form.formState.errors.departmentIds.message ?? '')}
        >
          <select
            id="staff-departments"
            multiple
            className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            {...form.register('departmentIds')}
          >
            {departmentsQuery.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FormField>

        {createMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'university', 'staff', createMutation.error)}
          </p>
        )}

        <Button type="submit" loading={createMutation.isPending} className="w-full sm:w-auto">
          {t('university:staff.createSubmit')}
        </Button>
      </form>

      {credential && (
        <div role="status" className="mt-6 flex flex-col gap-2 rounded-lg border border-warning bg-warning-muted p-4">
          <p className="text-sm font-medium text-foreground">{t('university:staff.resetPasswordOnceWarning')}</p>
          <p className="text-sm text-foreground">
            {credential.email}: <span className="font-mono">{credential.temporaryPassword}</span>
          </p>
          <div className="flex gap-2">
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
      )}

      {staffQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : staffQuery.data?.length === 0 ? (
        <EmptyState className="mt-6" title={t('university:staff.empty')} />
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {staffQuery.data?.map((member) => (
            <StaffRow
              key={member.membershipId}
              member={member}
              departments={departmentsQuery.data ?? []}
              isEditing={editingMembershipId === member.membershipId}
              onToggleEdit={() => setEditingMembershipId((current) => (current === member.membershipId ? null : member.membershipId))}
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
          ))}
        </ul>
      )}
    </div>
  )
}

interface StaffRowProps {
  member: StaffMemberResponse
  departments: { id: string; name: string }[]
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
    defaultValues: { role: member.role === 'UNIVERSITY_ADMIN' ? 'DEPARTMENT_COORDINATOR' : member.role, departmentIds: member.departmentIds },
  })

  const changeRoleMutation = useMutation({
    mutationFn: (values: ChangeStaffRoleFormValues) => universityApi.changeStaffRole(universityId, member.membershipId, values),
    onSuccess: onEditSaved,
  })

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{member.email}</p>
          <p className="text-xs text-foreground-secondary">{t(`university:staff.roles.${member.role}`)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {member.status && <StatusBadge tone={STATUS_TONE[member.status]}>{t(`university:staff.statusValues.${member.status}`)}</StatusBadge>}
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
          <button type="button" onClick={onRevoke} className="text-sm font-medium text-danger hover:underline">
            {t('university:staff.revoke')}
          </button>
        </div>
      </div>

      {isEditing && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-muted p-3"
          noValidate
          onSubmit={editForm.handleSubmit((values) => changeRoleMutation.mutate(values))}
        >
          <FormField label={t('university:staff.roleLabel')} htmlFor={`role-${member.membershipId}`}>
            <Select id={`role-${member.membershipId}`} {...editForm.register('role')}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`university:staff.roles.${role}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={t('university:staff.departmentsLabel')}
            htmlFor={`departments-${member.membershipId}`}
            error={editForm.formState.errors.departmentIds && t(editForm.formState.errors.departmentIds.message ?? '')}
          >
            <select
              id={`departments-${member.membershipId}`}
              multiple
              className="min-h-20 w-48 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              {...editForm.register('departmentIds')}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </FormField>
          {changeRoleMutation.isError && (
            <p className="w-full text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'university', 'staff', changeRoleMutation.error)}
            </p>
          )}
          <Button type="submit" size="sm" loading={changeRoleMutation.isPending}>
            {t('university:staff.saveRole')}
          </Button>
        </form>
      )}
    </li>
  )
}
