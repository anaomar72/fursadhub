import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, StatusBadge, Textarea } from '../../../components/ui'
import { WEEKLY_LOG_STATE_TONE } from './weeklyLogTone'
import type { WeeklyLogResponse } from '../types'

interface WeeklyLogCardProps {
  log: WeeklyLogResponse
  /** Who is looking. Determines which commands are offered — the backend enforces them regardless. */
  audience: 'student' | 'reviewer'
  busy: boolean
  error?: string | null
  onEdit?: (log: WeeklyLogResponse) => void
  onSubmit?: (log: WeeklyLogResponse) => void
  onReview?: (log: WeeklyLogResponse) => void
  onReturn?: (log: WeeklyLogResponse, comment: string) => void
}

/**
 * One weekly log, with the commands available to this viewer in this state.
 *
 * <p>Which buttons appear is derived from the log's own state and the backend's `editable` flag, not
 * from a local guess: the student sees "submit" only while the log is theirs, the reviewer sees
 * "review" and "return" only while it is with them. These are UX affordances — the backend refuses
 * the transition regardless of what is rendered (CLAUDE.md section 24).
 *
 * <p>Supervisor feedback on a returned log is shown prominently rather than tucked away, because it
 * is the one thing the student needs in order to act.
 */
export function WeeklyLogCard({
  log,
  audience,
  busy,
  error,
  onEdit,
  onSubmit,
  onReview,
  onReturn,
}: WeeklyLogCardProps) {
  const { t } = useTranslation()
  const [returning, setReturning] = useState(false)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)

  const isStudent = audience === 'student'
  const canSubmit = isStudent && log.editable
  const canReview = !isStudent && log.state === 'SUBMITTED'

  function handleReturn() {
    if (!comment.trim()) {
      setCommentError(t('internship:weeklyLogs.review.commentRequired'))
      return
    }
    setCommentError(null)
    onReturn?.(log, comment.trim())
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('internship:weeklyLogs.weekHeading', { week: log.weekNumber })}
          </h3>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {t('internship:weeklyLogs.period', { start: log.periodStart, end: log.periodEnd })}
          </p>
        </div>
        <StatusBadge tone={WEEKLY_LOG_STATE_TONE[log.state]}>
          {t(`internship:weeklyLogs.stateValues.${log.state}`)}
        </StatusBadge>
      </div>

      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <Field label={t('internship:weeklyLogs.form.summary')} value={log.summary} />
        <Field label={t('internship:weeklyLogs.form.activities')} value={log.activities} />
        <Field label={t('internship:weeklyLogs.form.challenges')} value={log.challenges} />
        <Field label={t('internship:weeklyLogs.form.learningOutcomes')} value={log.learningOutcomes} />
      </dl>

      {log.reviewComment && (
        <p
          className={
            log.state === 'RETURNED_FOR_CHANGES'
              ? 'mt-3 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning'
              : 'mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground-secondary'
          }
        >
          {t('internship:weeklyLogs.review.feedback', { comment: log.reviewComment })}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canSubmit && (
          <>
            <Button size="sm" onClick={() => onSubmit?.(log)} loading={busy}>
              {t('internship:weeklyLogs.actions.submit')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit?.(log)} disabled={busy}>
              {t('internship:weeklyLogs.actions.edit')}
            </Button>
          </>
        )}

        {canReview && !returning && (
          <>
            <Button size="sm" onClick={() => onReview?.(log)} loading={busy}>
              {t('internship:weeklyLogs.actions.review')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReturning(true)} disabled={busy}>
              {t('internship:weeklyLogs.actions.return')}
            </Button>
          </>
        )}
      </div>

      {canReview && returning && (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={`return-${log.id}`} className="text-sm font-medium text-foreground">
            {t('internship:weeklyLogs.review.commentLabel')}
          </label>
          <Textarea
            id={`return-${log.id}`}
            value={comment}
            invalid={!!commentError}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t('internship:weeklyLogs.review.commentPlaceholder')}
          />
          {commentError && (
            <p className="text-sm text-danger" role="alert">
              {commentError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleReturn} loading={busy}>
              {t('internship:weeklyLogs.actions.confirmReturn')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setReturning(false)
                setCommentError(null)
              }}
              disabled={busy}
            >
              {t('internship:actions.cancel')}
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null
  }
  return (
    <div>
      <dt className="text-xs text-foreground-secondary">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-foreground">{value}</dd>
    </div>
  )
}
