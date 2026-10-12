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
 * <p><strong>Columns scroll below xl, and fit above it.</strong> Six stages will never fit a phone,
 * so the board scrolls horizontally there rather than wrapping — wrapped columns stop reading as a
 * pipeline. But six 16rem columns need about 1560px, and the content area beside the rail is around
 * 1110px at 1440px wide, so on an ordinary desktop the last two columns were clipped with no
 * affordance that anything lay beyond them. The clipped pair ends OFFERED and ACCEPTED: a recruiter
 * with an accepted candidate saw a board of empty columns and a "1 candidate" count that appeared
 * to contradict it. From xl up the columns share the width instead, so the whole pipeline is
 * visible at once and the count always has something to agree with.
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
      {/* Phase 6: the stages wrap instead of scrolling sideways — stacked on a phone, two or three
          across on a tablet, all six from xl up — so no candidate is ever off-screen. */}
      <div>
        <ul
          className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          aria-label={t('recruitment:pool.boardLabel')}
        >
          {columns.map((column) => (
            <li key={column.status} className="min-w-0 rounded-lg border border-border bg-surface-muted p-3">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge tone={PIPELINE_STAGE_TONE[column.status]}>
                  {t(`recruitment:candidacyStatusValues.${column.status}`)}
                </StatusBadge>
                <span className="text-sm font-bold text-foreground">{column.candidates.length}</span>
              </div>

              {column.candidates.length === 0 ? (
                <p className="mt-2 text-caption text-foreground-secondary">
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
                          className="block rounded-md border border-border bg-surface p-3 transition-colors duration-150 ease-in-out hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                        >
                          <span className="block break-words text-body font-semibold text-foreground">
                            {candidate.studentFullName ?? candidate.studentEmail ?? candidate.studentUserId}
                          </span>
                          {title && <span className="mt-0.5 block break-words text-caption text-foreground-secondary">{title}</span>}
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
