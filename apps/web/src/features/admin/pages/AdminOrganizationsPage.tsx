import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/ui'
import * as adminApi from '../api/adminApi'
import { INSTITUTION_FILTER_STATUSES } from '../institutionWorkflow'
import { INSTITUTION_STATUS_TONE } from '../statusTone'
import { formatDate } from '../../../lib/utils/formatDate'
import type { AdminOrganization, InstitutionVerificationStatus } from '../types'

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
  const [status, setStatus] = useState<InstitutionVerificationStatus | ''>('SUBMITTED')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [page, setPage] = useState(0)

  const organizationsQuery = useQuery({
    queryKey: ['admin', 'organizations', status, submittedQuery, page],
    queryFn: () =>
      adminApi.listOrganizations({
        status: status === '' ? undefined : status,
        query: submittedQuery || undefined,
        page,
      }),
  })

  const columns: DataTableColumn<AdminOrganization>[] = [
    {
      key: 'name',
      header: t('admin:organizations.name'),
      render: (organization) => (
        <Link
          to={`/admin/organizations/${organization.id}`}
          className="rounded font-medium text-foreground hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {organization.name}
        </Link>
      ),
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
          setPage(0)
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
              setPage(0)
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
        <LoadingState label={t('common:status.loading')} />
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
