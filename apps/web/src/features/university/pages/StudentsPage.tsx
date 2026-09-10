import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as universityApi from '../api/universityApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type DataTableColumn,
  type StatusTone,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import type { StudentRowResponse } from '../types'

const STATUS_TONE: Record<string, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  NEEDS_MORE_EVIDENCE: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  REVOKED: 'danger',
}

/**
 * The university's student directory.
 *
 * <p>`GET /universities/{id}/students` accepts one parameter — `departmentId` — and returns the
 * whole list otherwise, so that is the only filter sent to the server. The search box narrows the
 * rows that already arrived; it is a real filter over real data, not a pretend server search, and
 * there is no pagination control because the endpoint does not paginate.
 *
 * <p>The department options a coordinator sees are their assigned departments only. That is
 * courtesy, not security: {@code VerificationQueryService} scopes the list to their departments
 * server-side whatever this sends (CLAUDE.md sections 24-25).
 */
export function StudentsPage() {
  const { t } = useTranslation()
  const { universityId, role, departmentIds } = useUniversityMembership()
  const [departmentId, setDepartmentId] = useState<string>(
    role === 'DEPARTMENT_COORDINATOR' && departmentIds.length === 1 ? departmentIds[0] : '',
  )
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const departmentsQuery = useQuery({
    queryKey: ['departments', universityId],
    queryFn: () => universityApi.listDepartments(universityId),
  })
  const studentsQuery = useQuery({
    queryKey: ['university', 'students', universityId, departmentId],
    queryFn: () => universityApi.listStudents(universityId, departmentId || undefined),
  })

  const visibleDepartments =
    role === 'UNIVERSITY_ADMIN'
      ? (departmentsQuery.data ?? [])
      : (departmentsQuery.data ?? []).filter((department) => departmentIds.includes(department.id))

  const departmentName = (id: string) =>
    departmentsQuery.data?.find((department) => department.id === id)?.name ?? id

  const term = search.trim().toLowerCase()
  const rows = (studentsQuery.data ?? []).filter((student) => {
    if (status && student.verificationStatus !== status) return false
    if (!term) return true
    return [student.email, student.studentNumber, student.program].some((value) =>
      value?.toLowerCase().includes(term),
    )
  })

  const columns: DataTableColumn<StudentRowResponse>[] = [
    {
      key: 'email',
      header: t('university:students.email'),
      render: (student) => <span className="font-medium text-foreground">{student.email ?? '—'}</span>,
    },
    {
      key: 'studentNumber',
      header: t('university:students.studentNumber'),
      render: (student) => <span className="text-foreground-secondary">{student.studentNumber}</span>,
    },
    {
      key: 'department',
      header: t('university:students.department'),
      render: (student) => <span className="text-foreground-secondary">{departmentName(student.departmentId)}</span>,
    },
    {
      key: 'program',
      header: t('university:students.program'),
      render: (student) => (
        <span className="text-foreground-secondary">
          {student.program}
          <span className="ml-1 text-xs text-muted">· {student.academicYear}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: t('university:students.status'),
      render: (student) => (
        <StatusBadge tone={STATUS_TONE[student.verificationStatus] ?? 'neutral'}>
          {t(`university:students.statusValues.${student.verificationStatus}`)}
        </StatusBadge>
      ),
    },
  ]

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('university:students.title')} description={t('university:students.subtitle')} />

      <FilterBar
        search={
          <SearchInput
            label={t('university:students.searchLabel')}
            placeholder={t('university:students.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        <Select
          aria-label={t('university:students.departmentLabel')}
          className="sm:w-52"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">{t('university:students.allDepartments')}</option>
          {visibleDepartments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('university:students.status')}
          className="sm:w-48"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t('university:students.allStatuses')}</option>
          {Object.keys(STATUS_TONE).map((value) => (
            <option key={value} value={value}>
              {t(`university:students.statusValues.${value}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {studentsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : studentsQuery.isError ? (
        <ErrorState onRetry={() => void studentsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('university:students.resultCount', { count: rows.length })}
          </p>
          <DataTable
            caption={t('university:students.title')}
            columns={columns}
            rows={rows}
            rowKey={(student) => student.enrollmentId}
            empty={<EmptyState title={t('university:students.empty')} />}
          />
        </>
      )}
    </PageContainer>
  )
}
