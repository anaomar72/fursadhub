import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AttentionQueue, Metric, Panel, SkeletonList, StatusBadge } from '../../../../components/ui'
import { CANDIDACY_STATUS_TONE } from '../../../../lib/status/statusTones'
import { formatDate } from '../../../../lib/utils/formatDate'
import { ATTENTION_DESTINATION, INFORMATIONAL, type OrganizationAttention } from '../../organizationAttention'
import type { CandidateWithOpportunity, OpportunityLoad } from '../../recruiterMetrics'
import { PIPELINE_STAGES } from '../../candidatePipeline'
import type { CandidateRowResponse } from '../../../recruitment/types'

/**
 * The building blocks every organization role's home is composed from (Phase 6). Each role's page
 * decides WHICH blocks it shows — the recruiter gets recruiting, the supervisor supervision — so the
 * same pattern reads the same way everywhere without one dashboard hiding another's controls.
 */

const linkClass =
  'rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

export function OrganizationAttentionQueue({ items, supervisor = false }: { items: OrganizationAttention[]; supervisor?: boolean }) {
  const { t } = useTranslation()
  const k = 'organization:workspace.attention'
  return (
    <AttentionQueue
      title={t(`${k}.title`)}
      clearTitle={t(`${k}.clearTitle`)}
      clearBody={t(supervisor ? `${k}.supervisorClearBody` : `${k}.clearBody`)}
      items={items.map((item) => ({
        id: item.kind,
        count: item.count,
        title: t(`${k}.items.${item.kind}.title`, { count: item.count }),
        action: { label: t(`${k}.items.${item.kind}.action`), to: ATTENTION_DESTINATION[item.kind] },
        tone: INFORMATIONAL.has(item.kind) ? 'info' : 'action',
      }))}
    />
  )
}

/** At most four honest figures (a list of Metrics — Metric renders spans, not dt/dd). `undefined` renders a dash while that figure is still loading. */
export function WorkspaceMetrics({ metrics }: { metrics: { id: string; label: string; value: number | undefined; to?: string }[] }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('organization:workspace.metrics.title')}>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-border bg-surface p-5 lg:grid-cols-4">
        {metrics.map((metric) => (
          <li key={metric.id} className="min-w-0">
            <Metric label={metric.label} value={metric.value ?? '—'} to={metric.value === undefined ? undefined : metric.to} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Candidates waiting on the organization — oldest first, so nobody waits longest unseen. */
export function CandidateQueue({ rows, loading }: { rows: CandidateWithOpportunity[]; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <Panel
      title={t('organization:workspace.work.candidatesTitle')}
      padding={loading || rows.length === 0 ? 'default' : 'none'}
      action={<Link to="/organization/candidates" className={linkClass}>{t('organization:dashboard.viewAll')}</Link>}
    >
      {loading ? (
        <SkeletonList rows={4} />
      ) : rows.length === 0 ? (
        <p className="text-body text-foreground-secondary">{t('organization:workspace.work.candidatesEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ candidate, opportunityTitle }) => (
            <li key={candidate.candidacyId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
              <span className="min-w-0 flex-1">
                <Link to={`/organization/candidacies/${candidate.candidacyId}`} className={`block break-words ${linkClass} text-foreground`}>
                  {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
                </Link>
                <span className="mt-0.5 block break-words text-caption text-foreground-secondary">
                  {opportunityTitle} · {formatDate(candidate.createdAt)}
                </span>
              </span>
              <StatusBadge tone={CANDIDACY_STATUS_TONE[candidate.status]}>{t(`recruitment:candidacyStatusValues.${candidate.status}`)}</StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Each recruiting internship with its applicant count and how many wait on the organization. */
export function InternshipLoad({ rows, loading }: { rows: OpportunityLoad[]; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <Panel
      title={t('organization:workspace.work.internshipsTitle')}
      padding={loading || rows.length === 0 ? 'compact' : 'none'}
      action={<Link to="/organization/opportunities" className={linkClass}>{t('organization:dashboard.viewAll')}</Link>}
    >
      {loading ? (
        <SkeletonList rows={3} />
      ) : rows.length === 0 ? (
        <p className="text-body text-foreground-secondary">{t('organization:workspace.work.internshipsEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.slice(0, 5).map((row) => (
            <li key={row.opportunityId} className="px-4 py-3">
              <Link to={`/organization/opportunities/${row.opportunityId}`} className={`block break-words ${linkClass} text-foreground`}>
                {row.title}
              </Link>
              <span className="mt-0.5 block text-caption text-foreground-secondary">
                {t('organization:workspace.work.applicants', { count: row.total })}
                {row.awaitingReview > 0 && <> · {t('organization:workspace.work.awaiting', { count: row.awaitingReview })}</>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/**
 * The pipeline as its real stages (CLAUDE.md section 37), each a link to that stage's filtered
 * list. Not a drag-and-drop board: stage changes are explicit commands with their own rules
 * (candidatePipeline.canTransition), never a drop target.
 */
export function PipelineStages({ candidates, loading, scope }: { candidates: CandidateRowResponse[]; loading: boolean; scope?: string }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="pipeline-stages-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pipeline-stages-heading" className="font-display text-title-panel text-foreground">
          {t('organization:workspace.work.pipelineTitle')}
        </h2>
        {scope && <p className="text-caption text-foreground-secondary">{scope}</p>}
      </div>
      {loading ? (
        <SkeletonList rows={1} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => {
            const value = candidates.filter((candidate) => candidate.status === stage).length
            return (
              <li key={stage}>
                <Link
                  to={`/organization/candidates?stage=${stage}`}
                  className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                >
                  <span className="break-words text-caption font-semibold text-foreground-secondary">
                    {t(`recruitment:candidacyStatusValues.${stage}`)}
                  </span>
                  <span className="font-display text-metric tabular-nums text-foreground">{value}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
