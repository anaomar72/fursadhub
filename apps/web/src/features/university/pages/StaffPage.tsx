import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { assignStaffSchema, type AssignStaffFormValues } from '../schemas/assignStaffSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, FormField, Input, LoadingSpinner, Select } from '../../../components/ui'

const ROLES: AssignStaffFormValues['role'][] = ['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR']

export function StaffPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const queryClient = useQueryClient()

  const staffQuery = useQuery({ queryKey: ['university', 'staff', universityId], queryFn: () => universityApi.listStaff(universityId) })
  const departmentsQuery = useQuery({ queryKey: ['departments', universityId], queryFn: () => universityApi.listDepartments(universityId) })

  const form = useForm<AssignStaffFormValues>({
    resolver: zodResolver(assignStaffSchema),
    defaultValues: { email: '', role: 'DEPARTMENT_COORDINATOR', departmentIds: [] },
  })
  const selectedRole = form.watch('role')

  const invalidateStaff = () => queryClient.invalidateQueries({ queryKey: ['university', 'staff', universityId] })

  const assignMutation = useMutation({
    mutationFn: (values: AssignStaffFormValues) => universityApi.assignStaff(universityId, values),
    onSuccess: () => {
      form.reset({ email: '', role: 'DEPARTMENT_COORDINATOR', departmentIds: [] })
      invalidateStaff()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (membershipId: string) => universityApi.revokeStaff(universityId, membershipId),
    onSuccess: invalidateStaff,
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('university:staff.title')}</h1>

      <form
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        noValidate
        onSubmit={form.handleSubmit((values) => assignMutation.mutate(values))}
      >
        <FormField
          label={t('university:staff.emailLabel')}
          htmlFor="staff-email"
          error={form.formState.errors.email && t(form.formState.errors.email.message ?? '')}
        >
          <Input id="staff-email" type="email" {...form.register('email')} />
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

        {selectedRole !== 'UNIVERSITY_ADMIN' && (
          <FormField label={t('university:staff.departmentsLabel')} htmlFor="staff-departments">
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
        )}

        {assignMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'university', 'staff', assignMutation.error)}
          </p>
        )}

        <Button type="submit" loading={assignMutation.isPending} className="w-full sm:w-auto">
          {t('university:staff.assignSubmit')}
        </Button>
      </form>

      {staffQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {staffQuery.data?.map((member) => (
            <li key={member.membershipId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{member.email}</p>
                <p className="text-xs text-foreground-secondary">{t(`university:staff.roles.${member.role}`)}</p>
              </div>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(member.membershipId)}
                className="text-sm font-medium text-danger hover:underline"
              >
                {t('university:staff.revoke')}
              </button>
            </li>
          ))}
          {staffQuery.data?.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-foreground-secondary">{t('university:staff.empty')}</li>
          )}
        </ul>
      )}
    </div>
  )
}
