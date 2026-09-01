import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { createDepartmentSchema, type CreateDepartmentFormValues } from '../schemas/departmentSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, EmptyState, FormField, Input, LoadingSpinner, PageHeader } from '../../../components/ui'
import type { DepartmentResponse } from '../types'

/**
 * Department directory + self-management (CLAUDE.md section 25). Creating a department is
 * UNIVERSITY_ADMIN-only — standing up a new department is a whole-university act. Renaming one is
 * open to UNIVERSITY_ADMIN and to the department's own DEPARTMENT_COORDINATOR: "managing" a
 * department one is assigned to is squarely within a coordinator's own scope.
 */
export function DepartmentsPage() {
  const { t } = useTranslation()
  const { universityId, role, departmentIds } = useUniversityMembership()
  const isAdmin = role === 'UNIVERSITY_ADMIN'
  const queryClient = useQueryClient()

  const departmentsQuery = useQuery({
    queryKey: ['departments', universityId],
    queryFn: () => universityApi.listDepartments(universityId),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['departments', universityId] })

  const form = useForm<CreateDepartmentFormValues>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: '', code: '' },
  })
  const createMutation = useMutation({
    mutationFn: (values: CreateDepartmentFormValues) => universityApi.createDepartment(universityId, values),
    onSuccess: () => {
      form.reset({ name: '', code: '' })
      invalidate()
    },
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const updateMutation = useMutation({
    mutationFn: ({ departmentId, name }: { departmentId: string; name: string }) =>
      universityApi.updateDepartment(universityId, departmentId, { name }),
    onSuccess: () => {
      setEditingId(null)
      invalidate()
    },
  })

  function canManage(department: DepartmentResponse) {
    return isAdmin || (role === 'DEPARTMENT_COORDINATOR' && departmentIds.includes(department.id))
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('university:departments.title')} />

      {departmentsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : (departmentsQuery.data ?? []).length === 0 ? (
        <EmptyState className="mt-6" title={t('university:departments.empty')} />
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {departmentsQuery.data?.map((department) =>
            editingId === department.id ? (
              <li key={department.id} className="flex items-center gap-2 px-4 py-3">
                <Input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  loading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ departmentId: department.id, name: editName })}
                >
                  {t('university:departments.save')}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  {t('university:departments.cancel')}
                </Button>
              </li>
            ) : (
              <li key={department.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-foreground">{department.name}</span>
                  <span className="ml-2 text-xs text-foreground-secondary">{department.code}</span>
                </div>
                {canManage(department) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(department.id)
                      setEditName(department.name)
                    }}
                  >
                    {t('university:departments.rename')}
                  </Button>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {updateMutation.isError && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {apiErrorMessage(t, 'university', 'departments', updateMutation.error)}
        </p>
      )}

      {isAdmin && (
        <form
          className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end"
          noValidate
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <FormField
            label={t('university:departments.nameLabel')}
            htmlFor="dept-name"
            className="flex-1"
            error={form.formState.errors.name && t(form.formState.errors.name.message ?? '')}
          >
            <Input id="dept-name" {...form.register('name')} />
          </FormField>
          <FormField
            label={t('university:departments.codeLabel')}
            htmlFor="dept-code"
            error={form.formState.errors.code && t(form.formState.errors.code.message ?? '')}
          >
            <Input id="dept-code" {...form.register('code')} />
          </FormField>
          <Button type="submit" loading={createMutation.isPending}>
            {t('university:departments.addSubmit')}
          </Button>
        </form>
      )}
      {createMutation.isError && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {apiErrorMessage(t, 'university', 'departments', createMutation.error)}
        </p>
      )}
    </div>
  )
}
