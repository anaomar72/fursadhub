import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { StatusBadge } from '../../../components/ui'
import * as evaluationsApi from '../../evaluations/api/evaluationsApi'
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
 * browser at all.
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
    <div className="flex flex-col gap-6">
      <CompletionPanel placement={placement} canComplete={false} />

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">{t('placements:supervisors.title')}</h2>
        <dl className="mt-3 flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-foreground-secondary">
              {t('placements:supervisors.universitySupervisor')}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {placement.universitySupervisor?.supervisorEmail ??
                t('placements:supervisors.unassigned')}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-secondary">
              {t('placements:supervisors.organizationSupervisor')}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {placement.organizationSupervisor?.supervisorEmail ??
                t('placements:supervisors.unassigned')}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('internship:evaluation.title')}</h2>
          {evaluation && (
            <StatusBadge tone="success">
              {t(`internship:evaluation.stateValues.${evaluation.state}`)}
            </StatusBadge>
          )}
        </div>
        {evaluation ? (
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Rating label={t('internship:evaluation.fields.overallRating')} value={evaluation.overallRating} />
            <Rating
              label={t('internship:evaluation.fields.professionalismRating')}
              value={evaluation.professionalismRating}
            />
            {evaluation.strengths && (
              <div className="sm:col-span-2">
                <dt className="text-foreground-secondary">{t('internship:evaluation.fields.strengths')}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-foreground">{evaluation.strengths}</dd>
              </div>
            )}
            {evaluation.finalComments && (
              <div className="sm:col-span-2">
                <dt className="text-foreground-secondary">{t('internship:evaluation.fields.finalComments')}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-foreground">{evaluation.finalComments}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-foreground-secondary">{t('internship:evaluation.notAvailable')}</p>
        )}
      </section>
    </div>
  )
}

function Rating({ label, value }: { label: string; value: number | null }) {
  const { t } = useTranslation()
  return (
    <div>
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="mt-0.5 text-foreground">
        {value === null ? t('internship:evaluation.notRated') : t('internship:evaluation.ratingOf', { value })}
      </dd>
    </div>
  )
}
