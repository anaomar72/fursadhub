import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Card,
  DataTable,
  Drawer,
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
import { distributionTone } from '../statusTone'
import { formatDate } from '../../../lib/utils/formatDate'
import type { AdminOpportunity, OpportunityMode, OpportunityStatus } from '../types'

const FILTER_STATUSES: OpportunityStatus[] = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'CANCELLED']
const FILTER_MODES: OpportunityMode[] = ['PUBLIC', 'UNIVERSITY_TARGETED', 'HYBRID']

/**
 * Platform-wide internship oversight (Backend Phase B6).
 *
 * <p><strong>Read-only, deliberately.</strong> There is no publish, pause, edit or delete control on
 * this screen, and no endpoint behind one: organizations own their opportunities and the state
 * machine has a single authority (CLAUDE.md section 33). A Super Admin can see everything here and
 * change nothing — which is what makes it safe to show everything.
 *
 * <p>Unlike public discovery, this lists every lifecycle state — including drafts and cancellations
 * the public never sees. The <em>Public</em> column is the reason the screen is useful: a listing can
 * be PUBLISHED and still invisible, because Backend Phase B1.5 hides opportunities whose organization
 * has since been suspended, and hides university-targeted-only ones by design. An operator asked "why
 * can nobody find this?" answers it from that column instead of guessing.
 *
 * <p>Search and both filters are the server's, so nothing is narrowed client-side over a partial page
 * and the result count always describes the filtered query.
 */
export function AdminOpportunitiesPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [status, setStatus] = useState<OpportunityStatus | ''>('')
  const [mode, setMode] = useState<OpportunityMode | ''>('')
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)

  const opportunitiesQuery = useQuery({
    queryKey: ['admin', 'opportunities', submittedQuery, status, mode, page],
    queryFn: () =>
      adminApi.listAdminOpportunities({
        query: submittedQuery || undefined,
        status: status === '' ? undefined : status,
        mode: mode === '' ? undefined : mode,
        page,
      }),
  })

  const columns: DataTableColumn<AdminOpportunity>[] = [
    {
      key: 'title',
      header: t('admin:opportunities.opportunity'),
      render: (opportunity) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{opportunity.title}</p>
          <p className="truncate text-xs text-muted">{opportunity.organizationName}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('admin:opportunities.status'),
      render: (opportunity) => (
        <StatusBadge tone={distributionTone(opportunity.status)}>
          {t(`admin:statusLabels.${opportunity.status}`, opportunity.status)}
        </StatusBadge>
      ),
    },
    {
      // The column that earns this screen's existence — see the class comment.
      key: 'publiclyDiscoverable',
      header: t('admin:opportunities.publicColumn'),
      render: (opportunity) => (
        <StatusBadge tone={opportunity.publiclyDiscoverable ? 'success' : 'neutral'}>
          {opportunity.publiclyDiscoverable
            ? t('admin:opportunities.publiclyVisible')
            : t('admin:opportunities.notPubliclyVisible')}
        </StatusBadge>
      ),
    },
    {
      key: 'mode',
      header: t('admin:opportunities.mode'),
      render: (opportunity) => (
        <span className="text-foreground-secondary">
          {t(`admin:opportunities.modes.${opportunity.mode}`, opportunity.mode)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('admin:opportunities.created'),
      className: 'whitespace-nowrap',
      render: (opportunity) => (
        <span className="text-foreground-secondary">{formatDate(opportunity.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('admin:opportunities.view')}</span>,
      render: (opportunity) => (
        <Button size="sm" variant="outline" onClick={() => setOpenId(opportunity.id)}>
          {t('admin:opportunities.view')}
        </Button>
      ),
    },
  ]

  const data = opportunitiesQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:opportunities.title')}
        description={t('admin:opportunities.description')}
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
              label={t('admin:opportunities.searchLabel')}
              placeholder={t('admin:opportunities.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
        >
          <Select
            aria-label={t('admin:opportunities.statusFilter')}
            className="sm:w-52"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as OpportunityStatus | '')
              setPage(0)
            }}
          >
            <option value="">{t('admin:opportunities.allStatuses')}</option>
            {FILTER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:statusLabels.${value}`, value)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('admin:opportunities.modeFilter')}
            className="sm:w-52"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as OpportunityMode | '')
              setPage(0)
            }}
          >
            <option value="">{t('admin:opportunities.allModes')}</option>
            {FILTER_MODES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:opportunities.modes.${value}`, value)}
              </option>
            ))}
          </Select>
        </FilterBar>
      </form>

      {opportunitiesQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : opportunitiesQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void opportunitiesQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-secondary" aria-live="polite">
            {t('admin:opportunities.resultCount', { count: data?.totalElements ?? 0 })}
          </p>

          {data && data.totalElements > 0 && data.content.length === 0 && (
            <Alert tone="info">{t('admin:opportunities.pageEmpty')}</Alert>
          )}

          <DataTable
            caption={t('admin:opportunities.title')}
            columns={columns}
            rows={data?.content ?? []}
            rowKey={(opportunity) => opportunity.id}
            empty={
              <EmptyState
                title={t('admin:opportunities.empty')}
                description={t('admin:opportunities.emptyHint')}
              />
            }
          />

          {data && data.totalPages > 1 && (
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <OpportunityDetailDrawer opportunityId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

/**
 * The full record, in a drawer rather than its own route.
 *
 * <p>Oversight is a scanning task — an operator checks one listing and goes back to the table — so a
 * drawer keeps the filtered result set intact behind it. It carries the organization's own authored
 * content and nothing about anyone who applied; the API has no field for that.
 */
function OpportunityDetailDrawer({
  opportunityId,
  onClose,
}: {
  opportunityId: string | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  const detailQuery = useQuery({
    queryKey: ['admin', 'opportunities', 'detail', opportunityId],
    queryFn: () => adminApi.getAdminOpportunity(opportunityId!),
    enabled: opportunityId !== null,
  })

  const detail = detailQuery.data

  return (
    <Drawer
      open={opportunityId !== null}
      onClose={onClose}
      title={detail?.summary.title ?? t('admin:opportunities.view')}
      closeLabel={t('common:actions.close')}
    >
      {detailQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : detailQuery.isError || !detail ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void detailQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Card padding="md" className="flex flex-col gap-2">
            <Field label={t('admin:opportunities.organization')} value={detail.summary.organizationName} />
            <Field
              label={t('admin:opportunities.organizationStatus')}
              value={t(
                `admin:statusLabels.${detail.summary.organizationVerificationStatus}`,
                detail.summary.organizationVerificationStatus,
              )}
            />
            <Field
              label={t('admin:opportunities.status')}
              value={t(`admin:statusLabels.${detail.summary.status}`, detail.summary.status)}
            />
            <Field
              label={t('admin:opportunities.publicColumn')}
              value={
                detail.summary.publiclyDiscoverable
                  ? t('admin:opportunities.publiclyVisible')
                  : t('admin:opportunities.notPubliclyVisible')
              }
            />
            <Field
              label={t('admin:opportunities.mode')}
              value={t(`admin:opportunities.modes.${detail.summary.mode}`, detail.summary.mode)}
            />
            <Field label={t('admin:opportunities.workMode')} value={detail.summary.workMode} />
            <Field label={t('admin:opportunities.location')} value={detail.summary.location} />
            <Field
              label={t('admin:opportunities.openings')}
              value={String(detail.summary.numberOfOpenings)}
            />
            <Field
              label={t('admin:opportunities.dates')}
              value={
                detail.summary.startDate && detail.summary.endDate
                  ? `${formatDate(detail.summary.startDate)} – ${formatDate(detail.summary.endDate)}`
                  : null
              }
            />
            <Field
              label={t('admin:opportunities.deadline')}
              value={detail.summary.applicationDeadline ? formatDate(detail.summary.applicationDeadline) : null}
            />
            <Field
              label={t('admin:opportunities.publishedAt')}
              value={detail.summary.publishedAt ? formatDate(detail.summary.publishedAt) : null}
            />
            {detail.hoursPerWeek != null && (
              <Field
                label={t('admin:opportunities.hoursPerWeek')}
                value={String(detail.hoursPerWeek)}
              />
            )}
          </Card>

          {detail.skills.length > 0 && (
            <TagList label={t('admin:opportunities.skills')} values={detail.skills} />
          )}
          {detail.perks.length > 0 && (
            <TagList label={t('admin:opportunities.perks')} values={detail.perks} />
          )}

          {detail.description && (
            <Prose label={t('admin:opportunities.descriptionLabel')} value={detail.description} />
          )}
          {detail.responsibilities && (
            <Prose label={t('admin:opportunities.responsibilities')} value={detail.responsibilities} />
          )}
          {detail.requirements && (
            <Prose label={t('admin:opportunities.requirements')} value={detail.requirements} />
          )}
        </div>
      )}
    </Drawer>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-sm text-foreground-secondary">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? '—'}</span>
    </div>
  )
}

function TagList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <ul className="flex flex-wrap gap-2">
        {values.map((value) => (
          <li
            key={value}
            className="rounded-full border border-border px-3 py-1 text-xs text-foreground-secondary"
          >
            {value}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Prose({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <p className="whitespace-pre-wrap text-sm text-foreground-secondary">{value}</p>
    </div>
  )
}
