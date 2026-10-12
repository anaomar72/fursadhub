import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as universityApi from '../api/universityApi'
import { universityQueries } from '../universityQueries'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { studentsByDepartment } from '../universityMetrics'
import { createDepartmentSchema, type CreateDepartmentFormValues } from '../schemas/departmentSchema'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Button, EmptyState, ErrorState, FormField, Input, PageHeader, Panel, SkeletonList } from '../../../components/ui'
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

  const departmentsQuery = useQuery(universityQueries.departments(universityId))
  // The same unfiltered directory the dashboards read — a cache hit, not a second request.
  const studentsQuery = useQuery(universityQueries.students(universityId))

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

      {/*
        Phase 7: a directory list rather than a grid of large cards — a department is a name, a code,
        two figures and at most one action. The student figures come from the directory the caller
        can already read; while it loads they show a dash rather than a zero.
      */}
      {departmentsQuery.isLoading ? (
        <SkeletonList rows={4} />
      ) : departmentsQuery.isError ? (
        <ErrorState onRetry={() => void departmentsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : departments.length === 0 ? (
        <EmptyState title={t('university:departments.empty')} description={isAdmin ? t('university:departments.emptyHint') : undefined} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface" aria-label={t('university:departments.title')}>
          {departments.map((department) => {
            const row = breakdown.get(department.id)
            const figure = (value: number | undefined) => (studentsQuery.isSuccess ? value ?? 0 : '—')
            return (
              <li key={department.id} className="p-4 sm:px-5">
                {editingId === department.id ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <FormField label={t('university:departments.nameLabel')} htmlFor={`rename-${department.id}`} className="flex-1">
                      <Input id={`rename-${department.id}`} value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus />
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
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="min-w-0 flex-1 basis-48">
                      <h2 className="break-words text-body font-semibold text-foreground">{department.name}</h2>
                      <p className="mt-0.5 text-caption uppercase tracking-wide text-foreground-secondary">{department.code}</p>
                    </div>
                    <dl className="flex gap-6 text-caption">
                      <div>
                        <dt className="text-foreground-secondary">{t('university:departments.students')}</dt>
                        <dd className="mt-0.5 text-body font-semibold text-foreground">{figure(row?.studentCount)}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground-secondary">{t('university:dashboard.verified')}</dt>
                        <dd className="mt-0.5 text-body font-semibold text-foreground">{figure(row?.verifiedCount)}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/university/students?department=${department.id}`}
                        className="rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        {t('university:departments.viewStudents')}
                        <span className="sr-only"> — {department.name}</span>
                      </Link>
                      {canManage(department) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t('university:departments.renameNamed', { name: department.name })}
                          onClick={() => {
                            setEditingId(department.id)
                            setEditName(department.name)
                          }}
                        >
                          {t('university:departments.rename')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
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
        <Panel title={t('university:departments.addTitle')}>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
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
        </Panel>
      )}
    </PageContainer>
  )
}
