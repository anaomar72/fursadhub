import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Alert, Card, Icon, StatusBadge } from '../../../components/ui'
import * as evaluationsApi from '../../evaluations/api/evaluationsApi'
import { EVALUATION_RATING_FIELDS } from '../../evaluations/types'
import { formatDate } from '../../../lib/utils/formatDate'
import { CompletionPanel } from '../components/CompletionPanel'
import type { PlacementResponse } from '../types'

/**
 * The student's overview of their own internship.
 *
 * <p>Read-only by design. The student owns the placement but does not drive its lifecycle — the
 * hosting organization does, and completion is the university's decision — so there are no command
 * buttons here, matching the backend, which refuses those commands from a student account regardless
 * of what the UI renders.
 *
 * <p>The organization's evaluation appears only once it is FINAL. That is not a UI choice: the
 * backend returns nothing to a student before then, so a draft assessment is never sent to the
 * browser at all ({@code PlacementEvaluationService.findVisibleTo}).
 */
export function StudentPlacementDetailPage() {
  const { t } = useTranslation()
  const placement = useOutletContext<PlacementResponse>()

  const evaluationQuery = useQuery({
    queryKey: ['evaluation', placement.id],
    queryFn: () => evaluationsApi.getEvaluation(placement.id),
  })

  const evaluation = evaluationQuery.data ?? null

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <CompletionPanel placement={placement} canComplete={false} />

        <div className="flex flex-col gap-5">
          <Card padding="lg">
            <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
              {t('placements:detail.aboutTitle')}
            </h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Row label={t('placements:detail.organization')} value={placement.organizationName} />
              <Row label={t('placements:detail.university')} value={placement.universityName} />
              <Row label={t('placements:detail.department')} value={placement.departmentName} />
              <Row
                label={t('placements:detail.dates')}
                value={t('placements:detail.dateRange', {
                  start: formatDate(placement.startDate),
                  end: formatDate(placement.endDate),
                })}
              />
              {placement.location && <Row label={t('placements:detail.location')} value={placement.location} />}
            </dl>
          </Card>

          <Card padding="lg">
            <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
              {t('placements:supervisors.title')}
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              <SupervisorRow
                label={t('placements:supervisors.universitySupervisor')}
                email={placement.universitySupervisor?.supervisorEmail ?? null}
              />
              <SupervisorRow
                label={t('placements:supervisors.organizationSupervisor')}
                email={placement.organizationSupervisor?.supervisorEmail ?? null}
              />
            </ul>
          </Card>
        </div>
      </div>

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-brand-navy dark:text-foreground">
              {t('internship:evaluation.title')}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">{t('placements:detail.evaluationHint')}</p>
          </div>
          {evaluation && (
            <StatusBadge tone="success">
              {t(`internship:evaluation.stateValues.${evaluation.state}`)}
            </StatusBadge>
          )}
        </div>

        {evaluation ? (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {EVALUATION_RATING_FIELDS.map((field) => (
                <Rating key={field} label={t(`internship:evaluation.fields.${field}`)} value={evaluation[field]} />
              ))}
            </dl>
            <dl className="mt-5 flex flex-col gap-4 border-t border-border pt-5 text-sm">
              {evaluation.strengths && (
                <Prose label={t('internship:evaluation.fields.strengths')} body={evaluation.strengths} />
              )}
              {evaluation.improvementAreas && (
                <Prose label={t('internship:evaluation.fields.improvementAreas')} body={evaluation.improvementAreas} />
              )}
              {evaluation.finalComments && (
                <Prose label={t('internship:evaluation.fields.finalComments')} body={evaluation.finalComments} />
              )}
            </dl>
          </>
        ) : evaluationQuery.isError ? (
          // Distinguished from "not written yet": telling a student their evaluation does not exist
          // when the request merely failed would be a lie about their own record.
          <Alert tone="warning" className="mt-4">
            {t('placements:detail.evaluationUnavailable')}
          </Alert>
        ) : (
          <p className="mt-4 rounded-md bg-surface-muted px-4 py-6 text-center text-sm text-foreground-secondary">
            {t('internship:evaluation.notAvailable')}
          </p>
        )}
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="font-semibold text-foreground">{value ?? t('common:status.notProvided')}</dd>
    </div>
  )
}

function SupervisorRow({ label, email }: { label: string; email: string | null }) {
  const { t } = useTranslation()
  return (
    <li className="flex items-center gap-3">
      <span
        className={
          email
            ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-brand-primary dark:bg-info-bg dark:text-info'
            : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted'
        }
      >
        <Icon name="user" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-foreground-secondary">{label}</span>
        <span className="block truncate text-sm font-semibold text-foreground">
          {email ?? t('placements:supervisors.unassigned')}
        </span>
      </span>
    </li>
  )
}

function Rating({ label, value }: { label: string; value: number | null }) {
  const { t } = useTranslation()
  return (
    <div>
      <dt className="text-xs text-foreground-secondary">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-brand-navy dark:text-foreground">
        {value === null ? t('internship:evaluation.notRated') : t('internship:evaluation.ratingOf', { value })}
      </dd>
    </div>
  )
}

function Prose({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-foreground">{body}</dd>
    </div>
  )
}
