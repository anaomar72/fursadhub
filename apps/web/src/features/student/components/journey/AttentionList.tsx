import { useTranslation } from 'react-i18next'
import { AttentionQueue } from '../../../../components/ui'
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
  return (
    <AttentionQueue
      className={className}
      title={t('student:journey.attention.title')}
      clearTitle={t('student:journey.attention.clearTitle')}
      clearBody={t('student:journey.attention.clearBody')}
      items={items.map((item) => {
        const { title, meta, action } = describe(item, t)
        return {
          id: `${item.kind}-${'id' in item ? item.id : ''}`,
          title,
          meta,
          action: { label: action, to: item.to },
          tone: item.kind === 'defenseScheduled' ? 'info' : 'action',
        }
      })}
    />
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
