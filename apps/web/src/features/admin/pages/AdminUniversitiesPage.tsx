import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/ui'
import { AdminTableSkeleton } from '../components/AdminSkeletons'
import { INSTITUTION_FILTER_STATUSES } from '../institutionWorkflow'
import { INSTITUTION_STATUS_TONE } from '../statusTone'
import { formatDate } from '../../../lib/utils/formatDate'
import type { AdminUniversity, InstitutionVerificationStatus } from '../types'
import { useListParams } from '../hooks/useListParams'
import { adminQueries } from '../adminQueries'

/**
 * The university verification queue (Phase 7, CLAUDE.md section 31).
 *
 * <p>Open on SUBMITTED, because that is the work: an administrator arriving here wants the ones
 * waiting on them, not an alphabetical list of every university on the platform.
 *
 * <p>Reviewing happens on the university's own page rather than inline in the row. Verifying an
 * institution means judging its license, and a decision that can be made without opening the record
 * is a decision made too easily.
 *
 * <p>Open to {@code VERIFICATION_OFFICER} as well as {@code SUPER_ADMIN} —
 * {@code requireReviewer} — which is the whole reason that role exists.
 */
export function AdminUniversitiesPage() {
  const { t } = useTranslation()
  // Status and page live in the URL, so the dashboard links straight into a filtered queue and a
  // reload keeps the reviewer where they were. The queue still opens on SUBMITTED.
  const { status, page, setStatus, setPage, resetPage } = useListParams(INSTITUTION_FILTER_STATUSES, 'SUBMITTED')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const universitiesQuery = useQuery(adminQueries.universities(status, submittedQuery, page))

  const columns: DataTableColumn<AdminUniversity>[] = [
    {
      key: 'name',
      header: t('admin:universities.name'),
      // The identifying column: DataTable makes it the row header and the row's link (rowHref).
      primary: true,
      render: (university) => university.name,
    },
    {
      // Universities have no type; a city is what distinguishes two similarly-named institutions.
      key: 'city',
      header: t('admin:universities.city'),
      render: (university) => (
        <span className="text-foreground-secondary">
          {university.city ?? t('common:status.notProvided')}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('admin:universities.statusFilter'),
      render: (university) => (
        <StatusBadge tone={INSTITUTION_STATUS_TONE[university.verificationStatus]}>
          {t(`admin:statusLabels.${university.verificationStatus}`)}
        </StatusBadge>
      ),
    },
    {
      key: 'evidence',
      header: t('admin:universities.evidence'),
      render: (university) =>
        university.hasEvidence ? (
          <span className="text-foreground-secondary">{formatDate(university.evidenceUploadedAt)}</span>
        ) : (
          <span className="text-muted">{t('admin:universities.noEvidence')}</span>
        ),
    },
    {
      key: 'createdAt',
      header: t('admin:universities.registered'),
      render: (university) => (
        <span className="text-foreground-secondary">{formatDate(university.createdAt)}</span>
      ),
    },
  ]

  const data = universitiesQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:verification.eyebrow')}
        title={t('admin:universities.title')}
        description={t('admin:universities.description')}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedQuery(query)
          resetPage()
        }}
      >
        <FilterBar
          search={
            <SearchInput
              label={t('admin:universities.searchLabel')}
              placeholder={t('admin:universities.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
        >
          <Select
            aria-label={t('admin:universities.statusFilter')}
            className="sm:w-56"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as InstitutionVerificationStatus | '')
            }}
          >
            <option value="">{t('admin:universities.allStatuses')}</option>
            {INSTITUTION_FILTER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:statusLabels.${value}`)}
              </option>
            ))}
          </Select>
        </FilterBar>
      </form>

      {universitiesQuery.isLoading ? (
        <AdminTableSkeleton columns={5} />
      ) : universitiesQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void universitiesQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:universities.resultCount', { count: data?.totalElements ?? 0 })}
          </p>

          <DataTable
            caption={t('admin:universities.title')}
            columns={columns}
            rows={data?.content ?? []}
            rowKey={(university) => university.id}
            rowHref={(university) => `/admin/universities/${university.id}`}
            density="dense"
            // Server-paginated, so nothing is sortable: sorting one page would present a partial
            // order as the whole one. Phones get one stacked row per record instead of a wide table.
            renderMobileRow={(university) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-semibold text-foreground">{university.name}</span>
                  <StatusBadge tone={INSTITUTION_STATUS_TONE[university.verificationStatus]}>{t(`admin:statusLabels.${university.verificationStatus}`)}</StatusBadge>
                </div>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-foreground-secondary">
                  {university.city && <span>{university.city}</span>}
                  <span>{university.hasEvidence ? t('admin:verification.evidenceOn', { date: formatDate(university.evidenceUploadedAt) }) : t('admin:universities.noEvidence')}</span>
                  <span>{t('admin:verification.registeredOn', { date: formatDate(university.createdAt) })}</span>
                </span>
              </div>
            )}
            empty={
              <EmptyState
                title={t('admin:universities.empty')}
                description={t('admin:universities.emptyHint')}
              />
            }
          />

          {(data?.totalPages ?? 0) > 1 && (
            <Pagination page={page} totalPages={data!.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}
