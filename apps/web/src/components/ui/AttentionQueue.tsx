import { useId, type ReactNode } from 'react'
import { ButtonLink } from './ButtonLink'
import { Icon } from './Icon'
import { SectionHeading } from './SectionHeading'
import { cn } from '../../lib/utils/cn'

export interface AttentionQueueItem {
  id: string
  title: ReactNode
  /** One supporting line: a deadline, a place, the queue it belongs to. */
  meta?: ReactNode
  action: { label: string; to: string }
  /**
   * `action` (default) — the reader must act; `info` — something to be aware of or a wait on
   * someone else (an offer awaiting the candidate, a scheduled defense).
   */
  tone?: 'action' | 'info'
  /** A real count from the API, shown in place of the glyph ("12" new applications). */
  count?: number
}

export interface AttentionQueueProps {
  title: string
  items: AttentionQueueItem[]
  /** The calm state when nothing needs attention — a confirmation, never an empty warning box. */
  clearTitle: string
  clearBody: string
  className?: string
}

/**
 * "What needs my attention" — the shared attention pattern for every workspace (student,
 * organization, and later the others).
 *
 * <p>Only actionable items belong here, each with one action. When nothing is due the section
 * stays, as a calm confirmation: an empty red panel teaches people to stop looking at it.
 *
 * <p>Tone is never the only signal: an item needing action carries the alert glyph (or its count),
 * an informational one the info glyph, and every action names its row through
 * `aria-describedby`, so a list of "Open" buttons is never ambiguous to a screen reader.
 */
export function AttentionQueue({ title, items, clearTitle, clearBody, className }: AttentionQueueProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className={className}>
      <SectionHeading id={headingId} title={title} />
      {items.length === 0 ? (
        <div className="mt-3 flex items-start gap-3 rounded-lg bg-success-bg p-4 text-body text-foreground">
          <Icon name="check" className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="font-semibold">{clearTitle}</p>
            <p className="mt-0.5 max-w-prose text-foreground-secondary">{clearBody}</p>
          </div>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map((item) => (
            <AttentionRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AttentionRow({ item }: { item: AttentionQueueItem }) {
  const titleId = useId()
  const info = item.tone === 'info'

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full font-display text-body font-bold tabular-nums',
          info ? 'bg-info-bg text-info' : 'bg-warning-bg text-warning',
        )}
      >
        {item.count !== undefined ? item.count : <Icon name={info ? 'info' : 'alert'} className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p id={titleId} className="break-words text-body font-semibold text-foreground">
          {item.title}
        </p>
        {item.meta && <p className="mt-0.5 break-words text-caption text-foreground-secondary">{item.meta}</p>}
      </div>
      <ButtonLink
        to={item.action.to}
        size="sm"
        variant={info ? 'outline' : 'primary'}
        aria-describedby={titleId}
        className="w-full sm:w-auto sm:shrink-0"
      >
        {item.action.label}
      </ButtonLink>
    </li>
  )
}
