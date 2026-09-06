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
import type { AdminUniversity, InstitutionVerificationStatus } from '../types'

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
  const [status, setStatus] = useState<InstitutionVerificationStatus | ''>('SUBMITTED')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [page, setPage] = useState(0)

  const universitiesQuery = useQuery({
    queryKey: ['admin', 'universities', status, submittedQuery, page],
    queryFn: () =>
      adminApi.listUniversities({
        status: status === '' ? undefined : status,
        query: submittedQuery || undefined,
        page,
      }),
  })

  const columns: DataTableColumn<AdminUniversity>[] = [
    {
      key: 'name',
      header: t('admin:universities.name'),
      render: (university) => (
        <Link
          to={`/admin/universities/${university.id}`}
          className="rounded font-medium text-foreground hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {university.name}
        </Link>
      ),
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
          setPage(0)
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
              setPage(0)
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
        <LoadingState label={t('common:status.loading')} />
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
