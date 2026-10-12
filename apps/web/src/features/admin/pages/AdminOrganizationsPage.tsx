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
import type { AdminOrganization, InstitutionVerificationStatus } from '../types'
import { useListParams } from '../hooks/useListParams'
import { adminQueries } from '../adminQueries'

/**
 * The organization verification queue (Phase 7, CLAUDE.md section 31).
 *
 * <p>Open on SUBMITTED, because that is the work: an administrator arriving here wants the ones
 * waiting on them, not an alphabetical list of every organization on the platform.
 *
 * <p>Reviewing happens on the organization's own page rather than inline in the row. Verifying an
 * institution means judging its license, and a decision that can be made without opening the record
 * is a decision made too easily.
 *
 * <p>Open to {@code VERIFICATION_OFFICER} as well as {@code SUPER_ADMIN} —
 * {@code requireReviewer} — which is the whole reason that role exists.
 */
export function AdminOrganizationsPage() {
  const { t } = useTranslation()
  // Status and page live in the URL, so the dashboard links straight into a filtered queue and a
  // reload keeps the reviewer where they were. The queue still opens on SUBMITTED.
  const { status, page, setStatus, setPage, resetPage } = useListParams(INSTITUTION_FILTER_STATUSES, 'SUBMITTED')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const organizationsQuery = useQuery(adminQueries.organizations(status, submittedQuery, page))

  const columns: DataTableColumn<AdminOrganization>[] = [
    {
      key: 'name',
      header: t('admin:organizations.name'),
      // The identifying column: DataTable makes it the row header and the row's link (rowHref).
      primary: true,
      render: (organization) => organization.name,
    },
    {
      key: 'type',
      header: t('admin:organizations.type'),
      render: (organization) => (
        <span className="text-foreground-secondary">
          {t(`admin:organizationTypes.${organization.type}`, organization.type)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('admin:organizations.statusFilter'),
      render: (organization) => (
        <StatusBadge tone={INSTITUTION_STATUS_TONE[organization.verificationStatus]}>
          {t(`admin:statusLabels.${organization.verificationStatus}`)}
        </StatusBadge>
      ),
    },
    {
      key: 'evidence',
      header: t('admin:organizations.evidence'),
      render: (organization) =>
        organization.hasEvidence ? (
          <span className="text-foreground-secondary">{formatDate(organization.evidenceUploadedAt)}</span>
        ) : (
          <span className="text-muted">{t('admin:organizations.noEvidence')}</span>
        ),
    },
    {
      key: 'createdAt',
      header: t('admin:organizations.registered'),
      render: (organization) => (
        <span className="text-foreground-secondary">{formatDate(organization.createdAt)}</span>
      ),
    },
  ]

  const data = organizationsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:verification.eyebrow')}
        title={t('admin:organizations.title')}
        description={t('admin:organizations.description')}
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
              label={t('admin:organizations.searchLabel')}
              placeholder={t('admin:organizations.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
        >
          <Select
            aria-label={t('admin:organizations.statusFilter')}
            className="sm:w-56"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as InstitutionVerificationStatus | '')
            }}
          >
            <option value="">{t('admin:organizations.allStatuses')}</option>
            {INSTITUTION_FILTER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:statusLabels.${value}`)}
              </option>
            ))}
          </Select>
        </FilterBar>
      </form>

      {organizationsQuery.isLoading ? (
        <AdminTableSkeleton columns={5} />
      ) : organizationsQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void organizationsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:organizations.resultCount', { count: data?.totalElements ?? 0 })}
          </p>

          <DataTable
            caption={t('admin:organizations.title')}
            columns={columns}
            rows={data?.content ?? []}
            rowKey={(organization) => organization.id}
            rowHref={(organization) => `/admin/organizations/${organization.id}`}
            density="dense"
            // Server-paginated, so nothing is sortable: sorting one page would present a partial
            // order as the whole one. Phones get one stacked row per record instead of a wide table.
            renderMobileRow={(organization) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-semibold text-foreground">{organization.name}</span>
                  <StatusBadge tone={INSTITUTION_STATUS_TONE[organization.verificationStatus]}>{t(`admin:statusLabels.${organization.verificationStatus}`)}</StatusBadge>
                </div>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-foreground-secondary">
                  {t(`admin:organizationTypes.${organization.type}`, organization.type) && <span>{t(`admin:organizationTypes.${organization.type}`, organization.type)}</span>}
                  <span>{organization.hasEvidence ? t('admin:verification.evidenceOn', { date: formatDate(organization.evidenceUploadedAt) }) : t('admin:organizations.noEvidence')}</span>
                  <span>{t('admin:verification.registeredOn', { date: formatDate(organization.createdAt) })}</span>
                </span>
              </div>
            )}
            empty={
              <EmptyState
                title={t('admin:organizations.empty')}
                description={t('admin:organizations.emptyHint')}
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
