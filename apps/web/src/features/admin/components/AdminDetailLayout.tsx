import type { ReactNode } from 'react'
import { Breadcrumbs, PageHeader, Panel } from '../../../components/ui'
import { cn } from '../../../lib/utils/cn'

/**
 * The one record-detail composition for the platform console (Phase 8): accounts, organizations
 * and universities all read the same way — who/what the record is, the facts, and a side column
 * holding its state and the commands that state allows.
 *
 * <p>Only presentation is shared. Each page still owns its domain: which facts, which commands,
 * which endpoint. There is no "institution detail" component with branches for every record type.
 *
 * <p>Desktop: `summary` and `main` stack on the left, `aside` runs down the right beside both.
 * Phone (DOM order): summary, aside, main — so the current state and the available commands are
 * never below a full evidence section.
 */
export interface AdminDetailLayoutProps {
  breadcrumbs: { label: string; to?: string }[]
  eyebrow?: string
  title: string
  description?: string
  /** The record's state, shown beside the title (a StatusBadge). */
  status?: ReactNode
  /** A short block that belongs above the decision on a phone — usually the record's key facts. */
  summary?: ReactNode
  /** The decision/action column. */
  aside: ReactNode
  asideLabel: string
  /** Everything else — evidence, memberships, history. */
  main?: ReactNode
  /** Page-level feedback (an action failure) that belongs above the content. */
  notice?: ReactNode
}

export function AdminDetailLayout({ breadcrumbs, eyebrow, title, description, status, summary, aside, asideLabel, main, notice }: AdminDetailLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={breadcrumbs} />
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={status} />
      {notice}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {summary && <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">{summary}</div>}
        <aside
          aria-label={asideLabel}
          className={cn('flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1', summary && main ? 'lg:row-span-2' : undefined)}
        >
          {aside}
        </aside>
        {main && <div className={cn('flex min-w-0 flex-col gap-6 lg:col-start-1', summary ? 'lg:row-start-2' : 'lg:row-start-1')}>{main}</div>}
      </div>
    </div>
  )
}

/** A titled group of label/value facts — a real `<dl>`, two columns where there is room. */
export function DetailSection({
  title,
  description,
  children,
  columns = 2,
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  columns?: 1 | 2
  action?: ReactNode
}) {
  return (
    <Panel title={title} description={description} action={action}>
      <dl className={cn('grid gap-x-6 gap-y-4', columns === 2 && 'sm:grid-cols-2')}>{children}</dl>
    </Panel>
  )
}

/**
 * Commands that take something away — suspension, revocation. Kept in their own panel so they are
 * never the nearest button to a routine one, and introduced by what they actually do.
 */
export function DangerZone({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Panel title={title} description={description} className="border-danger">
      {children}
    </Panel>
  )
}
