import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { studentsByDepartment } from '../universityMetrics'
import { createDepartmentSchema, type CreateDepartmentFormValues } from '../schemas/departmentSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Icon,
  Input,
  LoadingState,
  PageHeader,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import type { DepartmentResponse } from '../types'

/**
 * Department directory + self-management (CLAUDE.md section 25). Creating a department is
 * UNIVERSITY_ADMIN-only — standing up a new department is a whole-university act. Renaming one is
 * open to UNIVERSITY_ADMIN and to the department's own DEPARTMENT_COORDINATOR: "managing" a
 * department one is assigned to is squarely within a coordinator's own scope.
 *
 * <p>The per-department student figures are counted from the student directory the caller can
 * already read; there is no department-statistics endpoint and none is implied.
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
  const studentsQuery = useQuery({
    queryKey: ['university', 'students', universityId, ''],
    queryFn: () => universityApi.listStudents(universityId),
    retry: false,
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

  const breakdown = new Map(studentsByDepartment(studentsQuery.data ?? []).map((row) => [row.departmentId, row]))
  const departments = departmentsQuery.data ?? []

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('university:departments.title')} description={t('university:departments.subtitle')} />

      {departmentsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : departments.length === 0 ? (
        <EmptyState title={t('university:departments.empty')} description={isAdmin ? t('university:departments.emptyHint') : undefined} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const row = breakdown.get(department.id)
            return (
              <li key={department.id} className="flex">
                <Card padding="lg" className="flex w-full flex-col">
                  {editingId === department.id ? (
                    <div className="flex flex-col gap-3">
                      <FormField label={t('university:departments.nameLabel')} htmlFor={`rename-${department.id}`}>
                        <Input
                          id={`rename-${department.id}`}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          autoFocus
                        />
                      </FormField>
                      <div className="flex flex-wrap gap-2">
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
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info">
                          <Icon name="layers" className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-semibold text-foreground">{department.name}</h2>
                          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted">{department.code}</p>
                        </div>
                      </div>

                      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                        <div>
                          <dt className="text-xs text-foreground-secondary">{t('university:departments.students')}</dt>
                          <dd className="mt-0.5 text-lg font-bold text-brand-navy dark:text-foreground">
                            {row?.studentCount ?? 0}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-foreground-secondary">{t('university:dashboard.verified')}</dt>
                          <dd className="mt-0.5 text-lg font-bold text-brand-navy dark:text-foreground">
                            {row?.verifiedCount ?? 0}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Link
                          to={`/university/students?department=${department.id}`}
                          className="text-sm font-semibold text-link hover:underline"
                        >
                          {t('university:departments.viewStudents')}
                        </Link>
                        {canManage(department) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-auto"
                            onClick={() => {
                              setEditingId(department.id)
                              setEditName(department.name)
                            }}
                          >
                            {t('university:departments.rename')}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {updateMutation.isError && (
        <p className="text-sm text-danger" role="alert">
          {apiErrorMessage(t, 'university', 'departments', updateMutation.error)}
        </p>
      )}

      {isAdmin && (
        <Card padding="lg">
          <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
            {t('university:departments.addTitle')}
          </h2>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
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
              className="sm:w-40"
              error={form.formState.errors.code && t(form.formState.errors.code.message ?? '')}
            >
              <Input id="dept-code" {...form.register('code')} />
            </FormField>
            <Button type="submit" loading={createMutation.isPending}>
              {t('university:departments.addSubmit')}
            </Button>
          </form>
          {createMutation.isError && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {apiErrorMessage(t, 'university', 'departments', createMutation.error)}
            </p>
          )}
        </Card>
      )}
    </PageContainer>
  )
}
