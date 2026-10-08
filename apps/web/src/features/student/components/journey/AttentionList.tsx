import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ButtonLink, Icon, SectionHeading } from '../../../../components/ui'
import { cn } from '../../../../lib/utils/cn'
import { formatDate, formatDateTime } from '../../../../lib/utils/formatDate'
import type { AttentionItem } from '../../studentJourney'

interface AttentionListProps {
  items: AttentionItem[]
  className?: string
}

/**
 * "Needs your attention" — only things the student can act on now.
 *
 * <p>Each row says what it is, why it matters (a deadline, a count, a place) and offers ONE action.
 * When nothing needs action the section stays, but as a calm confirmation rather than an empty
 * warning box — an empty red panel teaches people to stop looking at it.
 *
 * <p>Tone is never the only signal: an action needed carries the alert glyph, an upcoming event
 * (a scheduled defense) the calendar-style info glyph, and every row's action names its target
 * through `aria-describedby` so "Open" is never ambiguous to a screen reader.
 */
export function AttentionList({ items, className }: AttentionListProps) {
  const { t } = useTranslation()
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className={className}>
      <SectionHeading id={headingId} title={t('student:journey.attention.title')} />
      {items.length === 0 ? (
        <div className="mt-3 flex items-start gap-3 rounded-lg bg-success-bg p-4 text-body text-foreground">
          <Icon name="check" className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="font-semibold">{t('student:journey.attention.clearTitle')}</p>
            <p className="mt-0.5 max-w-prose text-foreground-secondary">{t('student:journey.attention.clearBody')}</p>
          </div>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map((item) => (
            <AttentionRow key={`${item.kind}-${'id' in item ? item.id : ''}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const { t } = useTranslation()
  const titleId = useId()
  const { title, meta, action } = describe(item, t)
  const upcoming = item.kind === 'defenseScheduled'

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          upcoming ? 'bg-info-bg text-info' : 'bg-warning-bg text-warning',
        )}
      >
        <Icon name={upcoming ? 'info' : 'alert'} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p id={titleId} className="break-words text-body font-semibold text-foreground">
          {title}
        </p>
        {meta && <p className="mt-0.5 break-words text-caption text-foreground-secondary">{meta}</p>}
      </div>
      <ButtonLink to={item.to} size="sm" variant={upcoming ? 'outline' : 'primary'} aria-describedby={titleId} className="w-full sm:w-auto sm:shrink-0">
        {action}
      </ButtonLink>
    </li>
  )
}

function describe(item: AttentionItem, t: (key: string, options?: Record<string, unknown>) => string) {
  const k = 'student:journey.attention.items'
  switch (item.kind) {
    case 'offer':
      return {
        title: t(`${k}.offer.title`, { title: item.title }),
        meta: t(`${k}.offer.meta`, { date: formatDate(item.deadline) }),
        action: t(`${k}.offer.action`),
      }
    case 'nomination':
      return {
        title: item.title ? t(`${k}.nomination.title`, { title: item.title }) : t(`${k}.nomination.titleNoOpportunity`),
        meta: item.organization ? t(`${k}.nomination.meta`, { organization: item.organization }) : null,
        action: t(`${k}.nomination.action`),
      }
    case 'enrollment':
      return {
        title: t(`${k}.enrollment.${item.status}.title`),
        meta: t(`${k}.enrollment.${item.status}.meta`),
        action: t(`${k}.enrollment.action`),
      }
    case 'weeklyLogReturned':
      return {
        title: t(`${k}.weeklyLogReturned.title`, { week: item.weekNumber }),
        meta: t(`${k}.weeklyLogReturned.meta`),
        action: t(`${k}.weeklyLogReturned.action`),
      }
    case 'attendanceToConfirm':
      return {
        title: t(`${k}.attendanceToConfirm.title`, { count: item.count }),
        meta: t(`${k}.attendanceToConfirm.meta`),
        action: t(`${k}.attendanceToConfirm.action`),
      }
    case 'finalReportRevision':
      return {
        title: t(`${k}.finalReportRevision.title`),
        meta: t(`${k}.finalReportRevision.meta`),
        action: t(`${k}.finalReportRevision.action`),
      }
    case 'defenseScheduled':
      return {
        title: t(`${k}.defenseScheduled.title`),
        meta: item.location
          ? t(`${k}.defenseScheduled.metaWithLocation`, { date: formatDateTime(item.scheduledAt), location: item.location })
          : t(`${k}.defenseScheduled.meta`, { date: formatDateTime(item.scheduledAt) }),
        action: t(`${k}.defenseScheduled.action`),
      }
  }
}
