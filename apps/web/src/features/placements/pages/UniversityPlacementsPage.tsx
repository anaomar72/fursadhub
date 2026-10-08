import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useUniversityMembership } from '../../university/components/UniversityMembershipContext'
import { universityCapabilities } from '../../university/universityCapabilities'
import { universityQueries } from '../../university/universityQueries'
import { LIVE_PLACEMENT_STATUSES } from '../../university/universityMetrics'
import { PLACEMENT_STATUS_TONE } from '../components/statusTone'
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  SearchInput,
  Select,
  SkeletonList,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'
import { formatDate } from '../../../lib/utils/formatDate'
import type { PlacementResponse, PlacementStatus } from '../types'

const STATUSES: PlacementStatus[] = ['PLANNED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED', 'CANCELLED', 'TERMINATED']

const linkClass =
  'rounded-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/**
 * The university's internships (CLAUDE.md section 25), Phase 7.
 *
 * <p>What arrives is already narrowed by the backend to the caller's real scope — an admin's whole
 * university, a coordinator's departments, a supervisor's own assignments — and this page filters
 * only for display. Department isolation is a backend boundary, never re-implemented here.
 *
 * <p>The academic-supervisor column is why this is a table: an unfilled post on a running
 * internship is the university's to fill, and it needs to be scannable down a column. The status
 * and "no academic supervisor" filters live in the URL so the dashboards can link straight to them.
 */
export function UniversityPlacementsPage() {
  const { t } = useTranslation()
  const membership = useUniversityMembership()
  const can = universityCapabilities(membership)
  const managing = can.canCompletePlacements
  const [params, setParams] = useSearchParams()
  const status = (STATUSES as string[]).includes(params.get('status') ?? '') ? (params.get('status') as PlacementStatus) : ''
  const unassigned = params.get('supervisor') === 'unassigned'
  const [search, setSearch] = useState('')

  const placementsQuery = useQuery(universityQueries.placements(membership.universityId))

  const setFilter = (key: 'status' | 'supervisor', value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const needsSupervisor = (placement: PlacementResponse) => LIVE_PLACEMENT_STATUSES.includes(placement.status) && !placement.universitySupervisor

  const term = search.trim().toLowerCase()
  const rows = (placementsQuery.data ?? []).filter((placement) => {
    if (status && placement.status !== status) return false
    if (unassigned && !needsSupervisor(placement)) return false
    if (!term) return true
    return [placement.studentFullName, placement.studentEmail, placement.organizationName, placement.opportunityTitle, placement.departmentName].some(
      (value) => value?.toLowerCase().includes(term),
    )
  })

  const studentName = (placement: PlacementResponse) => placement.studentFullName ?? placement.studentEmail ?? t('university:workspace.unknownStudent')
  const supervisorCell = (placement: PlacementResponse) =>
    placement.universitySupervisor ? (
      <span className="block break-words text-foreground-secondary">
        {placement.universitySupervisor.supervisorDisplayName ?? placement.universitySupervisor.supervisorEmail ?? t('placements:university.supervisorAssigned')}
      </span>
    ) : needsSupervisor(placement) && managing ? (
      <StatusBadge tone="warning">{t('placements:university.supervisorMissing')}</StatusBadge>
    ) : (
      <span className="text-foreground-secondary">—</span>
    )

  const columns: DataTableColumn<PlacementResponse>[] = [
    {
      key: 'student',
      header: t('placements:university.student'),
      render: (placement) => (
        <span className="block min-w-0">
          <Link to={`/university/placements/${placement.id}`} className={`block break-words ${linkClass}`}>
            {studentName(placement)}
          </Link>
          {placement.departmentName && <span className="block break-words text-caption text-foreground-secondary">{placement.departmentName}</span>}
        </span>
      ),
    },
    {
      key: 'internship',
      header: t('placements:university.internship'),
      render: (placement) => (
        <span className="block min-w-0">
          <span className="block break-words text-foreground">{placement.organizationName ?? '—'}</span>
          <span className="block break-words text-caption text-foreground-secondary">{placement.opportunityTitle ?? t('placements:detail.untitledOpportunity')}</span>
        </span>
      ),
    },
    {
      key: 'dates',
      header: t('placements:university.dates'),
      render: (placement) => (
        <span className="whitespace-nowrap text-foreground-secondary">
          {t('placements:detail.dateRange', { start: formatDate(placement.startDate), end: formatDate(placement.endDate) })}
        </span>
      ),
    },
    { key: 'supervisor', header: t('placements:university.academicSupervisor'), render: supervisorCell },
    {
      key: 'status',
      header: t('placements:university.status'),
      render: (placement) => (
        <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>{t(`placements:statusValues.${placement.status}`)}</StatusBadge>
      ),
    },
  ]

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title={t('placements:university.title')}
        description={can.scopedToAssignedPlacements ? t('placements:university.supervisorDescription') : t('placements:university.description')}
      />

      <FilterBar
        search={
          <SearchInput
            label={t('placements:university.searchLabel')}
            placeholder={t('placements:university.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        <Select aria-label={t('placements:university.status')} className="sm:w-52" value={status} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">{t('placements:university.allStatuses')}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`placements:statusValues.${value}`)}
            </option>
          ))}
        </Select>
        {!can.scopedToAssignedPlacements && (
          <Select
            aria-label={t('placements:university.academicSupervisor')}
            className="sm:w-56"
            value={unassigned ? 'unassigned' : ''}
            onChange={(event) => setFilter('supervisor', event.target.value)}
          >
            <option value="">{t('placements:university.anySupervisor')}</option>
            <option value="unassigned">{t('placements:university.supervisorMissing')}</option>
          </Select>
        )}
      </FilterBar>

      {placementsQuery.isLoading ? (
        <SkeletonList rows={5} />
      ) : placementsQuery.isError ? (
        <ErrorState title={t('common:status.error')} onRetry={() => void placementsQuery.refetch()} retryLabel={t('common:actions.retry')} />
      ) : (
        <>
          <p className="text-body text-foreground-secondary" aria-live="polite">
            {t('placements:university.resultCount', { count: rows.length })}
          </p>
          <DataTable
            caption={t('placements:university.title')}
            columns={columns}
            rows={rows}
            rowKey={(placement) => placement.id}
            // Phones: one stacked row per student — who, where, when, status, and the academic
            // supervisor gap — instead of a table scrolled sideways.
            renderMobileRow={(placement) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/university/placements/${placement.id}`} className={`min-w-0 break-words ${linkClass}`}>
                    {studentName(placement)}
                  </Link>
                  <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>{t(`placements:statusValues.${placement.status}`)}</StatusBadge>
                </div>
                <p className="break-words text-caption text-foreground-secondary">
                  {[placement.organizationName, placement.opportunityTitle, placement.departmentName].filter(Boolean).join(' · ')}
                </p>
                <p className="text-caption text-foreground-secondary">
                  {t('placements:detail.dateRange', { start: formatDate(placement.startDate), end: formatDate(placement.endDate) })}
                </p>
                {needsSupervisor(placement) && managing && <StatusBadge tone="warning">{t('placements:university.supervisorMissing')}</StatusBadge>}
              </div>
            )}
            empty={
              <EmptyState
                title={status || unassigned || term ? t('placements:university.noMatches') : t('placements:university.empty')}
                description={
                  status || unassigned || term
                    ? undefined
                    : can.scopedToAssignedPlacements
                      ? t('placements:university.emptySupervisorHint')
                      : t('placements:university.emptyHint')
                }
              />
            }
          />
        </>
      )}
    </PageContainer>
  )
}
