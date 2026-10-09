import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ButtonLink, Icon, StatusBadge, type IconName } from '../../../../components/ui'
import { cn } from '../../../../lib/utils/cn'
import { formatDate } from '../../../../lib/utils/formatDate'
import { PLACEMENT_STATUS_TONE } from '../../../../lib/status/statusTones'
import type { StudentStage, StudentStatus } from '../../studentJourney'

/** What kind of moment each stage is — drives the one small glyph beside the headline. */
const STAGE_KIND: Record<StudentStage, 'act' | 'wait' | 'good'> = {
  placementActive: 'good',
  placementPlanned: 'good',
  completionPending: 'wait',
  offerWaiting: 'act',
  nominationWaiting: 'act',
  enrollmentMissing: 'act',
  enrollmentIncomplete: 'act',
  enrollmentChangesRequested: 'act',
  enrollmentInReview: 'wait',
  enrollmentClosed: 'act',
  applicationsInProgress: 'wait',
  completed: 'good',
  readyToApply: 'good',
}

const KIND_STYLE: Record<'act' | 'wait' | 'good', { icon: IconName; className: string }> = {
  act: { icon: 'alert', className: 'bg-warning-bg text-warning' },
  wait: { icon: 'info', className: 'bg-info-bg text-info' },
  good: { icon: 'check', className: 'bg-success-bg text-success' },
}

interface StudentStatusHeroProps {
  status: StudentStatus
  /** The earliest pending offer deadline, for the offer stage's sentence. */
  offerDeadline?: string | null
}

/**
 * The top of the student's workspace: where they are, what it means, and the one thing to do next.
 * Compact on purpose — it is a status line with an action, not a marketing banner. When the stage
 * is about a placement, the placement itself (role, organization, dates, status) is part of it, so
 * the current internship is the first thing on the page.
 */
export function StudentStatusHero({ status, offerDeadline }: StudentStatusHeroProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const kind = KIND_STYLE[STAGE_KIND[status.stage]]
  const placement = status.placement
  const k = `student:journey.stages.${status.stage}`

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-caption font-semibold uppercase tracking-wide text-foreground-secondary">{t('student:journey.eyebrow')}</p>
      <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <span aria-hidden="true" className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full', kind.className)}>
            <Icon name={kind.icon} className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="break-words font-display text-title-section text-foreground">
              {t(`${k}.title`)}
            </h2>
            <p className="mt-1.5 max-w-prose break-words text-body-lg text-foreground-secondary">
              {t(`${k}.body`, { date: formatDate(status.stage === 'offerWaiting' ? offerDeadline : placement?.startDate) })}
            </p>
            {placement && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link
                  to={`/student/placements/${placement.id}`}
                  className="rounded-sm break-words text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {placement.opportunityTitle ?? t('placements:detail.untitledOpportunity')}
                </Link>
                <StatusBadge tone={PLACEMENT_STATUS_TONE[placement.status]}>{t(`placements:statusValues.${placement.status}`)}</StatusBadge>
                <span className="w-full break-words text-caption text-foreground-secondary">
                  {t('student:journey.placementMeta', {
                    organization: placement.organizationName ?? '',
                    start: formatDate(placement.startDate),
                    end: formatDate(placement.endDate),
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
          <ButtonLink to={status.primary.to} size="lg" className="w-full sm:w-auto">
            {t(`student:journey.actions.${status.primary.labelKey}`)}
          </ButtonLink>
          {status.secondary && (
            <ButtonLink to={status.secondary.to} size="lg" variant="ghost" className="w-full sm:w-auto">
              {t(`student:journey.actions.${status.secondary.labelKey}`)}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  )
}
