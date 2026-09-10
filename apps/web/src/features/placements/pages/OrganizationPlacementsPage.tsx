import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as placementsApi from '../api/placementsApi'
import { useOrganizationMembership } from '../../organization/components/OrganizationMembershipContext'
import { organizationCapabilities } from '../../organization/organizationCapabilities'
import { PLACEMENT_STATUS_TONE } from '../components/statusTone'
import { usePlacementRecords } from '../hooks/usePlacementRecords'
import { evaluationOutstanding, unsettledAttendance } from '../../organization/supervisorMetrics'
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
import type { PlacementResponse, PlacementStatus } from '../types'

const STATUSES: PlacementStatus[] = [
  'PLANNED',
  'ACTIVE',
  'COMPLETION_PENDING',
  'COMPLETED',
  'CANCELLED',
  'TERMINATED',
]

/**
 * The organization's interns (CLAUDE.md section 26).
 *
 * <p>The organization id comes from the caller's resolved membership rather than anything typed
 * into the URL, and the backend re-checks that membership on every request — an
 * {@code ORGANIZATION_SUPERVISOR} receives only the placements they are actively assigned to,
 * without this page filtering anything itself.
 *
 * <p>The supervisor column is the reason this is a table rather than a card list: an unfilled
 * supervisor post on a running placement is the one thing here that is somebody's job today, and it
 * needs to be scannable down a column.
 */
export function OrganizationPlacementsPage() {
  const { t } = useTranslation()
  const membership = useOrganizationMembership()
  const can = organizationCapabilities(membership)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const placementsQuery = useQuery({
    queryKey: ['placements', 'organization', membership.organizationId],
    queryFn: () => placementsApi.listOrganizationPlacements(membership.organizationId),
  })

  // For a supervisor this list IS their intern list, so it carries the two records they act on.
  // Only fanned out for that role — an admin's or recruiter's list can span the whole organization,
  // and neither of them settles attendance or writes the evaluation anyway.
  const placements = placementsQuery.data ?? []
  const supervising = can.scopedToAssignedPlacements
  const attendance = usePlacementRecords(placements, 'attendance', supervising && !placementsQuery.isLoading)
  const evaluations = usePlacementRecords(placements, 'evaluation', supervising && !placementsQuery.isLoading)

  const attendanceFor = (placementId: string) =>
    attendance.rows.find((row) => row.placement.id === placementId)?.data
  const evaluationFor = (placementId: string) =>
    evaluations.rows.find((row) => row.placement.id === placementId)?.data

  const term = search.trim().toLowerCase()
  const rows = placements.filter((placement) => {
    if (status && placement.status !== status) return false
    if (!term) return true
    return [placement.studentFullName, placement.studentEmail, placement.universityName, placement.opportunityTitle].some(
      (value) => value?.toLowerCase().includes(term),
    )
  })

  const columns: DataTableColumn<PlacementResponse>[] = [
    {
      key: 'student',
      header: t('placements:organization.intern'),
      render: (placement) => (
        <span className="block min-w-0">
          <Link
            to={`/organization/placements/${placement.id}`}
            className="block truncate font-medium text-foreground hover:text-link hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {placement.studentFullName ?? placement.studentEmail ?? placement.studentUserId}
          </Link>
          <span className="block truncate text-xs text-muted">
            {placement.opportunityTitle ?? t('placements:detail.untitledOpportunity')}
          </span>
        </span>
      ),
    },
    {
      key: 'university',
      header: t('placements:organization.university'),
      render: (placement) => (
        <span className="block min-w-0">
          <span className="block truncate text-foreground-secondary">{placement.universityName ?? '—'}</span>
          {placement.departmentName && (
            <span className="block truncate text-xs text-muted">{placement.departmentName}</span>
          )}
        </span>
      ),
    },
    {
      key: 'dates',
      header: t('placements:organization.dates'),
      render: (placement) => (
        <span className="whitespace-nowrap text-foreground-secondary">
          {t('placements:detail.dateRange', {
            start: formatDate(placement.startDate),
            end: formatDate(placement.endDate),
          })}
        </span>
      ),
    },
    {
      key: 'supervisor',
      header: t('placements:organization.supervisor'),
      render: (placement) =>
        placement.organizationSupervisor ? (
          <span className="block truncate text-foreground-secondary">
            {placement.organizationSupervisor.supervisorEmail ?? placement.organizationSupervisor.supervisorUserId}
          </span>
        ) : (placement.status === 'PLANNED' || placement.status === 'ACTIVE') && can.canManagePlacementLifecycle ? (
          <StatusBadge tone="warning">{t('placements:organization.supervisorMissing')}</StatusBadge>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: t('placements:organization.status'),
      render: (placement) => (
        <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>
          {t(`placements:statusValues.${placement.status}`)}
        </StatusBadge>
      ),
    },
  ]

  // A supervisor already knows who the supervisor is — it is them. That column is replaced with
  // what they actually need: whether either record they own is still outstanding.
  const supervisorColumns: DataTableColumn<PlacementResponse>[] = [
    {
      key: 'attendance',
      header: t('placements:organization.attendance'),
      render: (placement) => {
        if (attendance.isLoading) return <span className="text-muted">…</span>
        const unsettled = unsettledAttendance(attendanceFor(placement.id) ?? [])
        return unsettled.length > 0 ? (
          <StatusBadge tone="warning">
            {t('placements:organization.attendanceUnsettled', { count: unsettled.length })}
          </StatusBadge>
        ) : (
          <span className="text-muted">{t('placements:organization.attendanceSettled')}</span>
        )
      },
    },
    {
      key: 'evaluation',
      header: t('placements:organization.evaluation'),
      render: (placement) => {
        if (evaluations.isLoading) return <span className="text-muted">…</span>
        const evaluation = evaluationFor(placement.id)
        return (
          <StatusBadge tone={evaluationOutstanding(evaluation) ? 'warning' : 'success'}>
            {evaluation
              ? t(`internship:evaluation.stateValues.${evaluation.state}`)
              : t('organization:supervisorDashboard.evaluationNotStarted')}
          </StatusBadge>
        )
      },
    },
  ]

  const visibleColumns = supervising
    ? [...columns.filter((column) => column.key !== 'supervisor'), ...supervisorColumns]
    : columns

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('placements:organization.title')}
        description={
          can.scopedToAssignedPlacements
            ? t('placements:organization.supervisorDescription')
            : t('placements:organization.description')
        }
      />

      <FilterBar
        search={
          <SearchInput
            label={t('placements:organization.searchLabel')}
            placeholder={t('placements:organization.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        <Select
          aria-label={t('placements:organization.status')}
          className="sm:w-52"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t('placements:organization.allStatuses')}</option>
          {STATUSES.map((value) => (
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
            {t('placements:organization.resultCount', { count: rows.length })}
          </p>
          <DataTable
            caption={t('placements:organization.title')}
            columns={visibleColumns}
            rows={rows}
            rowKey={(placement) => placement.id}
            empty={<EmptyState title={t('placements:organization.empty')} />}
          />
        </>
      )}
    </PageContainer>
  )
}
