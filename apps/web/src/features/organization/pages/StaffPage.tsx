import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { createMemberSchema, type CreateMemberFormValues } from '../schemas/createMemberSchema'
import { changeMemberRoleSchema, type ChangeMemberRoleFormValues } from '../schemas/changeMemberRoleSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, EmptyState, FormField, Input, LoadingSpinner, PageHeader, Select, StatusBadge } from '../../../components/ui'
import type { StatusTone } from '../../../components/ui'
import type { OrganizationMemberResponse, TemporaryCredentialResponse, UserAccountStatus } from '../types'

const ROLES: CreateMemberFormValues['role'][] = ['RECRUITER', 'ORGANIZATION_SUPERVISOR']

const STATUS_TONE: Record<UserAccountStatus, StatusTone> = {
  PENDING_CONTACT_VERIFICATION: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  CLOSED: 'neutral',
}

export function StaffPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()
  const queryClient = useQueryClient()
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null)
  const [credential, setCredential] = useState<TemporaryCredentialResponse | null>(null)

  const membersQuery = useQuery({
    queryKey: ['organization', 'members', organizationId],
    queryFn: () => organizationApi.listMembers(organizationId),
  })

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', role: 'RECRUITER' },
  })

  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ['organization', 'members', organizationId] })

  const createMutation = useMutation({
    mutationFn: (values: CreateMemberFormValues) => organizationApi.createMember(organizationId, values),
    onSuccess: () => {
      form.reset({ email: '', password: '', confirmPassword: '', role: 'RECRUITER' })
      invalidateMembers()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (membershipId: string) => organizationApi.revokeMember(organizationId, membershipId),
    onSuccess: invalidateMembers,
  })

  const suspendMutation = useMutation({
    mutationFn: (membershipId: string) => organizationApi.suspendMember(organizationId, membershipId),
    onSuccess: invalidateMembers,
  })

  const reactivateMutation = useMutation({
    mutationFn: (membershipId: string) => organizationApi.reactivateMember(organizationId, membershipId),
    onSuccess: invalidateMembers,
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (membershipId: string) => organizationApi.resetMemberPassword(organizationId, membershipId),
    onSuccess: (result) => setCredential(result),
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('organization:staff.title')} />

      <form
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        noValidate
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <FormField
          label={t('organization:staff.emailLabel')}
          htmlFor="org-staff-email"
          error={form.formState.errors.email && t(form.formState.errors.email.message ?? '')}
        >
          <Input id="org-staff-email" type="email" {...form.register('email')} />
        </FormField>

        <FormField
          label={t('organization:staff.passwordLabel')}
          htmlFor="org-staff-password"
          error={form.formState.errors.password && t(form.formState.errors.password.message ?? '')}
        >
          <Input id="org-staff-password" type="password" autoComplete="new-password" {...form.register('password')} />
        </FormField>

        <FormField
          label={t('organization:staff.confirmPasswordLabel')}
          htmlFor="org-staff-confirm-password"
          error={form.formState.errors.confirmPassword && t(form.formState.errors.confirmPassword.message ?? '')}
        >
          <Input id="org-staff-confirm-password" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
        </FormField>

        <FormField label={t('organization:staff.roleLabel')} htmlFor="org-staff-role">
          <Select id="org-staff-role" {...form.register('role')}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`organization:staff.roles.${role}`)}
              </option>
            ))}
          </Select>
        </FormField>

        {createMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'organization', 'staff', createMutation.error)}
          </p>
        )}

        <Button type="submit" loading={createMutation.isPending} className="w-full sm:w-auto">
          {t('organization:staff.createSubmit')}
        </Button>
      </form>

      {credential && (
        <div role="status" className="mt-6 flex flex-col gap-2 rounded-lg border border-warning bg-warning-muted p-4">
          <p className="text-sm font-medium text-foreground">{t('organization:staff.resetPasswordOnceWarning')}</p>
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
              {t('organization:staff.copyCredentials')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCredential(null)}>
              {t('organization:staff.dismiss')}
            </Button>
          </div>
        </div>
      )}

      {membersQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : membersQuery.data?.length === 0 ? (
        <EmptyState className="mt-6" title={t('organization:staff.empty')} />
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {membersQuery.data?.map((member) => (
            <MemberRow
              key={member.membershipId}
              member={member}
              isEditing={editingMembershipId === member.membershipId}
              onToggleEdit={() => setEditingMembershipId((current) => (current === member.membershipId ? null : member.membershipId))}
              onEditSaved={() => {
                setEditingMembershipId(null)
                invalidateMembers()
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

interface MemberRowProps {
  member: OrganizationMemberResponse
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
    mutationFn: (values: ChangeMemberRoleFormValues) => organizationApi.changeMemberRole(organizationId, member.membershipId, values),
    onSuccess: onEditSaved,
  })

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{member.email}</p>
          <p className="text-xs text-foreground-secondary">{t(`organization:staff.roles.${member.role}`)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {member.status && <StatusBadge tone={STATUS_TONE[member.status]}>{t(`organization:staff.statusValues.${member.status}`)}</StatusBadge>}
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
          <button type="button" onClick={onRevoke} className="text-sm font-medium text-danger hover:underline">
            {t('organization:staff.revoke')}
          </button>
        </div>
      </div>

      {isEditing && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-muted p-3"
          noValidate
          onSubmit={editForm.handleSubmit((values) => changeRoleMutation.mutate(values))}
        >
          <FormField label={t('organization:staff.roleLabel')} htmlFor={`role-${member.membershipId}`}>
            <Select id={`role-${member.membershipId}`} {...editForm.register('role')}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`organization:staff.roles.${role}`)}
                </option>
              ))}
            </Select>
          </FormField>
          {changeRoleMutation.isError && (
            <p className="w-full text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'organization', 'staff', changeRoleMutation.error)}
            </p>
          )}
          <Button type="submit" size="sm" loading={changeRoleMutation.isPending}>
            {t('organization:staff.saveRole')}
          </Button>
        </form>
      )}
    </li>
  )
}
