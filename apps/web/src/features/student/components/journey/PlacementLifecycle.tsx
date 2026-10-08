import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LifecycleTracker, type LifecycleTrackerStep } from '../../../../components/ui'
import { formatDate, formatDateTime } from '../../../../lib/utils/formatDate'
import type { CompletionRequirementType, PlacementResponse } from '../../../placements/types'
import { deriveLifecycle, type LifecycleStep, type PlacementSignals } from '../../studentJourney'

/** Requirements the student can open a page for. The evaluation is the supervisor's, not theirs. */
const MODULE_PATH: Partial<Record<CompletionRequirementType, string>> = {
  WEEKLY_LOGS: 'weekly-logs',
  ATTENDANCE: 'attendance',
  FINAL_REPORT: 'final-report',
  DEFENSE: 'defense',
}

interface PlacementLifecycleProps {
  placement: PlacementResponse
  signals: PlacementSignals
  /** Whether the completion checklist failed to load — the requirement group is then explained, not guessed. */
  completionUnavailable?: boolean
  /** Link each requirement to its module page (the hub, the dashboard). */
  linkModules?: boolean
  className?: string
}

/**
 * The internship lifecycle tracker for one placement, worded for the student. All state comes from
 * {@link deriveLifecycle} (placement status + the backend completion checklist); this component only
 * phrases it — including the backend's own short `detail` ("3/12", "NEEDS_REVISION").
 */
export function PlacementLifecycle({ placement, signals, completionUnavailable = false, linkModules = false, className }: PlacementLifecycleProps) {
  const { t } = useTranslation()
  const steps = deriveLifecycle(placement, signals)
  const hasRequirements = steps.some((step) => step.group === 'requirements')
  const base = `/student/placements/${placement.id}`

  const trackerSteps: LifecycleTrackerStep[] = steps.map((step) => {
    const modulePath = MODULE_PATH[step.id as CompletionRequirementType]
    return {
      id: step.id,
      label: t(`student:journey.lifecycle.steps.${step.id}`),
      state: step.state,
      group: step.group,
      description: describeStep(step, placement, signals, t),
      action:
        linkModules && modulePath && step.state !== 'notReached' ? (
          <Link
            to={`${base}/${modulePath}`}
            className="rounded-sm text-caption font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {t('student:journey.attention.open')}{' '}
            <span className="sr-only">{t(`student:journey.lifecycle.steps.${step.id}`)}</span>
          </Link>
        ) : undefined,
    }
  })

  return (
    <div className={className}>
      <LifecycleTracker
        label={t('student:journey.lifecycle.label')}
        steps={trackerSteps}
        groups={{ requirements: t('student:journey.lifecycle.requirementsGroup') }}
      />
      {!hasRequirements && signals.completion && (
        <p className="mt-3 text-caption text-foreground-secondary">{t('student:journey.lifecycle.noRequirements')}</p>
      )}
      {!hasRequirements && completionUnavailable && (
        <p className="mt-3 text-caption text-foreground-secondary">{t('student:journey.lifecycle.unavailable')}</p>
      )}
    </div>
  )
}

function describeStep(
  step: LifecycleStep,
  placement: PlacementResponse,
  signals: PlacementSignals,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | undefined {
  const k = 'student:journey.lifecycle.details'
  const ended = placement.status === 'CANCELLED' || placement.status === 'TERMINATED'
  switch (step.id) {
    case 'placement':
      return undefined
    case 'started':
      if (placement.status === 'PLANNED') return t(`${k}.startsOn`, { date: formatDate(placement.startDate) })
      if (step.state === 'complete') return t(`${k}.startedOn`, { date: formatDate(placement.startedAt ?? placement.startDate) })
      return undefined
    case 'completion':
      if (placement.status === 'COMPLETED') return t(`${k}.completedOn`, { date: formatDate(placement.completedAt) })
      if (placement.status === 'COMPLETION_PENDING') return t(`${k}.completionPending`)
      if (ended) return t(`${k}.ended`)
      return undefined
    case 'WEEKLY_LOGS':
    case 'ATTENDANCE': {
      const [done, total] = (step.detail ?? '').split('/')
      if (!total) return undefined
      return t(`${k}.${step.id === 'WEEKLY_LOGS' ? 'weeklyLogs' : 'attendance'}`, { done, total })
    }
    case 'ORGANIZATION_EVALUATION':
      return step.detail ? t(`${k}.evaluation.${step.detail}`, { defaultValue: '' }) || undefined : undefined
    case 'FINAL_REPORT':
      return step.detail ? t(`${k}.finalReport.${step.detail}`, { defaultValue: '' }) || undefined : undefined
    case 'DEFENSE': {
      const scheduled = (signals.defenseAttempts ?? []).find((attempt) => attempt.state === 'SCHEDULED')
      if (scheduled && step.state !== 'complete') return formatDateTime(scheduled.scheduledAt)
      return step.detail ? t(`${k}.defense.${step.detail}`, { defaultValue: '' }) || undefined : undefined
    }
  }
}
