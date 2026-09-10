import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../../placements/api/placementsApi'
import { useUniversityMembership } from '../components/UniversityMembershipContext'
import { supervisedStudents, type SupervisedStudent } from '../supervisionMetrics'
import { PLACEMENT_STATUS_TONE } from '../../placements/components/statusTone'
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
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import type { PlacementStatus } from '../../placements/types'

const STATUS_FILTERS: PlacementStatus[] = [
  'PLANNED',
  'ACTIVE',
  'COMPLETION_PENDING',
  'COMPLETED',
  'CANCELLED',
  'TERMINATED',
]

/**
 * The students a university supervisor is responsible for.
 *
 * <p>This exists because the university's student directory is not theirs to read:
 * {@code GET /universities/{id}/students} admits only {@code UNIVERSITY_ADMIN} and
 * {@code DEPARTMENT_COORDINATOR} ({@code VerificationQueryService.scopedEnrollments}), and a
 * supervisor's scope is their actively assigned placements
 * ({@code PlacementQueryService.listForUniversity}). So the roster IS the placement list, collapsed
 * to distinct students — every field shown comes from the placement record the API already
 * returned, and no additional endpoint is called.
 *
 * <p>That is also why this page shows placement facts rather than enrollment facts: it deliberately
 * does not show student number, program, academic year or verification status, because those come
 * from the enrollment record this role cannot read. Search and status filtering narrow rows that
 * already arrived; the placement endpoint takes no query parameters and does not paginate.
 */
export function SupervisedStudentsPage() {
  const { t } = useTranslation()
  const { universityId } = useUniversityMembership()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const placementsQuery = useQuery({
    queryKey: ['placements', 'university', universityId],
    queryFn: () => placementsApi.listUniversityPlacements(universityId),
  })

  const term = search.trim().toLowerCase()
  const rows = supervisedStudents(placementsQuery.data ?? []).filter((student) => {
    if (status && !student.placements.some((placement) => placement.status === status)) return false
    if (!term) return true
    return [student.fullName, student.email, student.departmentName].some((value) =>
      value?.toLowerCase().includes(term),
    )
  })

  const columns: DataTableColumn<SupervisedStudent>[] = [
    {
      key: 'student',
      header: t('university:supervisedStudents.student'),
      render: (student) => (
        <span className="block min-w-0">
          {/* The name is the link, the way a placement row links from its title everywhere else.
              A separate trailing action column would add a fifth column on a 390px screen for an
              affordance the name already carries. */}
          <Link
            to={`/university/placements/${(student.currentPlacement ?? student.placements[0]).id}`}
            className="block truncate font-medium text-foreground hover:text-link hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {student.fullName ?? student.email ?? student.studentUserId}
          </Link>
          {student.fullName && student.email && (
            <span className="block truncate text-xs text-muted">{student.email}</span>
          )}
        </span>
      ),
    },
    {
      key: 'department',
      header: t('university:supervisedStudents.department'),
      render: (student) => (
        <span className="text-foreground-secondary">{student.departmentName ?? '—'}</span>
      ),
    },
    {
      key: 'organization',
      header: t('university:supervisedStudents.organization'),
      render: (student) => (
        <span className="text-foreground-secondary">
          {(student.currentPlacement ?? student.placements[0]).organizationName ?? '—'}
        </span>
      ),
    },
    {
      key: 'internship',
      header: t('university:supervisedStudents.internship'),
      render: (student) => {
        const placement = student.currentPlacement ?? student.placements[0]
        return (
          <span className="block min-w-0">
            <span className="block truncate text-foreground-secondary">
              {placement.opportunityTitle ?? t('placements:detail.untitledOpportunity')}
            </span>
            <span className="block text-xs text-muted">
              {t('placements:detail.dateRange', {
                start: formatDate(placement.startDate),
                end: formatDate(placement.endDate),
              })}
            </span>
          </span>
        )
      },
    },
    {
      key: 'status',
      header: t('university:supervisedStudents.status'),
      render: (student) => {
        const placement = student.currentPlacement ?? student.placements[0]
        return (
          <span className="flex flex-col items-start gap-1">
            <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>
              {t(`placements:statusValues.${placement.status}`)}
            </StatusBadge>
            {student.placements.length > 1 && (
              <span className="text-xs text-muted">
                {t('university:supervisedStudents.placementCount', { count: student.placements.length })}
              </span>
            )}
          </span>
        )
      },
    },
  ]

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('university:supervisedStudents.eyebrow')}
        title={t('university:supervisedStudents.title')}
        description={t('university:supervisedStudents.subtitle')}
      />

      <FilterBar
        search={
          <SearchInput
            label={t('university:supervisedStudents.searchLabel')}
            placeholder={t('university:supervisedStudents.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        <Select
          aria-label={t('university:supervisedStudents.status')}
          className="sm:w-52"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t('university:supervisedStudents.allStatuses')}</option>
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {t(`placements:statusValues.${value}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {placementsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : placementsQuery.isError ? (
        <ErrorState onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('university:supervisedStudents.resultCount', { count: rows.length })}
          </p>
          <DataTable
            caption={t('university:supervisedStudents.title')}
            columns={columns}
            rows={rows}
            rowKey={(student) => student.studentUserId}
            empty={
              <EmptyState
                title={t('university:supervisedStudents.empty')}
                description={t('university:supervisedStudents.emptyHint')}
              />
            }
          />
        </>
      )}
    </PageContainer>
  )
}
