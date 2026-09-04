import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PIPELINE_STAGE_TONE, closedCount, pipelineColumns } from '../../organization/candidatePipeline'
import { Badge, EmptyState, StatusBadge } from '../../../components/ui'
import { formatDate } from '../../../lib/utils/formatDate'
import type { CandidateRowResponse } from '../types'

interface CandidateBoardProps {
  candidates: CandidateRowResponse[]
  /** Shown under each name when the board spans more than one internship. */
  opportunityTitle?: (candidate: CandidateRowResponse) => string | undefined
  emptyMessage: string
}

/**
 * The candidate pipeline as a board, one column per REAL candidacy state.
 *
 * <p>Read-only by design, and that is the important part. The backend moves a candidacy only
 * through named commands with its own validity rules ({@code CandidacyStateMachine}), so a
 * drag-and-drop board would either have to guess which moves are legal or optimistically show a
 * move the API then rejects. Neither is acceptable — a card must never appear to have moved before
 * the server says it did. Stage changes happen on the candidate's own page, where the available
 * commands are the ones the backend will actually accept.
 *
 * <p>Columns scroll horizontally rather than wrapping: six stages will not fit a phone, and the
 * longer Somali stage names must not push the page wider than the viewport.
 */
export function CandidateBoard({ candidates, opportunityTitle, emptyMessage }: CandidateBoardProps) {
  const { t } = useTranslation()
  const columns = pipelineColumns(candidates)
  const closed = closedCount(candidates)

  if (candidates.length === 0) {
    return <EmptyState title={emptyMessage} />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max items-start gap-3" aria-label={t('recruitment:pool.boardLabel')}>
          {columns.map((column) => (
            <li key={column.status} className="w-64 shrink-0 rounded-lg border border-border bg-surface-muted p-3">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge tone={PIPELINE_STAGE_TONE[column.status]}>
                  {t(`recruitment:candidacyStatusValues.${column.status}`)}
                </StatusBadge>
                <span className="text-sm font-bold text-foreground">{column.candidates.length}</span>
              </div>

              {column.candidates.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
                  {t('recruitment:pool.stageEmpty')}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {column.candidates.map((candidate) => {
                    const title = opportunityTitle?.(candidate)
                    return (
                      <li key={candidate.candidacyId}>
                        <Link
                          to={`/organization/candidacies/${candidate.candidacyId}`}
                          className="block rounded-md border border-border bg-surface p-3 transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none motion-reduce:hover:transform-none"
                        >
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
                          </span>
                          {title && <span className="mt-0.5 block truncate text-xs text-muted">{title}</span>}
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge>{t(`recruitment:sourceValues.${candidate.source}`)}</Badge>
                            <span className="text-xs text-muted">{formatDate(candidate.createdAt)}</span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted">{t('recruitment:pool.closedCount', { count: closed })}</p>
    </div>
  )
}
