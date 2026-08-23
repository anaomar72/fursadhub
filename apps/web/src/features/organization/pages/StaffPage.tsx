import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as organizationApi from '../api/organizationApi'
import { useOrganizationMembership } from '../components/OrganizationMembershipContext'
import { assignMemberSchema, type AssignMemberFormValues } from '../schemas/assignMemberSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Input, LoadingSpinner, Select } from '../../../components/ui'

const ROLES: AssignMemberFormValues['role'][] = ['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR']

export function StaffPage() {
  const { t } = useTranslation()
  const { organizationId } = useOrganizationMembership()
  const queryClient = useQueryClient()

  const membersQuery = useQuery({
    queryKey: ['organization', 'members', organizationId],
    queryFn: () => organizationApi.listMembers(organizationId),
  })

  const form = useForm<AssignMemberFormValues>({
    resolver: zodResolver(assignMemberSchema),
    defaultValues: { email: '', role: 'RECRUITER' },
  })

  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ['organization', 'members', organizationId] })

  const assignMutation = useMutation({
    mutationFn: (values: AssignMemberFormValues) => organizationApi.assignMember(organizationId, values),
    onSuccess: () => {
      form.reset({ email: '', role: 'RECRUITER' })
      invalidateMembers()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (membershipId: string) => organizationApi.revokeMember(organizationId, membershipId),
    onSuccess: invalidateMembers,
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('organization:staff.title')}</h1>

      <form
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        noValidate
        onSubmit={form.handleSubmit((values) => assignMutation.mutate(values))}
      >
        <FormField
          label={t('organization:staff.emailLabel')}
          htmlFor="org-staff-email"
          error={form.formState.errors.email && t(form.formState.errors.email.message ?? '')}
        >
          <Input id="org-staff-email" type="email" {...form.register('email')} />
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

        {assignMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'organization', 'staff', assignMutation.error)}
          </p>
        )}

        <Button type="submit" loading={assignMutation.isPending} className="w-full sm:w-auto">
          {t('organization:staff.assignSubmit')}
        </Button>
      </form>

      {membersQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {membersQuery.data?.map((member) => (
            <li key={member.membershipId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{member.email}</p>
                <p className="text-xs text-foreground-secondary">{t(`organization:staff.roles.${member.role}`)}</p>
              </div>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(member.membershipId)}
                className="text-sm font-medium text-danger hover:underline"
              >
                {t('organization:staff.revoke')}
              </button>
            </li>
          ))}
          {membersQuery.data?.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-foreground-secondary">{t('organization:staff.empty')}</li>
          )}
        </ul>
      )}
    </div>
  )
}
