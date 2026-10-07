import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { useMediaQuery } from '../../lib/utils/useMediaQuery'
import { Icon } from './Icon'
import { Skeleton, SkeletonList } from './Skeleton'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
  /**
   * The row's identifying column — the name/email/title a person reads to know which row this is.
   * Rendered as a row header (`<th scope="row">`), so a screen reader announces it with every cell
   * of the row. With `rowHref`, its content becomes the row's link. At most one column.
   */
  primary?: boolean
  /**
   * Makes the column sortable on the client, by this value. See the note on sorting below: only
   * enable this when `rows` is the COMPLETE dataset.
   */
  sortValue?: (row: T) => string | number | null | undefined
  /** `end` for numbers and dates-as-counts, so figures line up. */
  align?: 'start' | 'end'
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Visually hidden; names the table for assistive technology. */
  caption?: string
  empty?: ReactNode
  /**
   * Where a row leads. The PRIMARY column's content is rendered as a real `<a>`, which is the
   * keyboard and screen-reader route to the row. A click anywhere else on the row is a pointer
   * convenience that follows the same link — it never replaces it. Keep the primary column's
   * `render` plain text when using this: it is wrapped in the link.
   */
  rowHref?: (row: T) => string
  /** Shows placeholder rows instead of `rows` while the first page is loading. */
  loading?: boolean
  loadingRows?: number
  /** `comfortable` for organization/university lists; `dense` for platform-admin grids. */
  density?: 'comfortable' | 'dense'
  /**
   * Below 768px, render each row with this instead of the table. Without it the table keeps its
   * columns and scrolls horizontally inside its own frame (never the page).
   *
   * <p>Deliberately an explicit renderer rather than an automatic "every cell becomes a label/value
   * pair" transformation: a generic stack loses the one thing a table gives — knowing which value
   * matters — so each page decides what a row says on a phone. With `rowHref` the whole mobile row
   * is the link, so the renderer must not contain other interactive elements.
   */
  renderMobileRow?: (row: T) => ReactNode
  className?: string
}

type SortState = { key: string; direction: 'ascending' | 'descending' } | null

const DENSITY = {
  comfortable: { head: 'px-4 py-3', cell: 'px-4 py-3' },
  dense: { head: 'px-3 py-2', cell: 'px-3 py-2' },
} as const

/** Clicks that land on a control inside the row belong to that control, not to the row. */
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [role="link"]'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function compare(a: string | number | null | undefined, b: string | number | null | undefined): number {
  // Missing values sort last in both directions' natural reading: they are the least informative.
  if (a == null || a === '') return b == null || b === '' ? 0 : 1
  if (b == null || b === '') return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/**
 * The shared data table.
 *
 * <p><strong>Interaction semantics.</strong> Rows are not focusable and have no click role. The
 * previous version made each `<tr>` keyboard-focusable with an `onClick`, which a screen reader
 * announces as plain row text with no indication that it does anything. Navigation is now a real
 * link in the identifying cell (`rowHref` + a `primary` column); the rest of the row follows that
 * link on click for pointer users.
 *
 * <p><strong>Sorting.</strong> Client-side only, over the `rows` passed in. FursadHub's list
 * endpoints do not accept a sort parameter today, so a table fed one server page at a time must NOT
 * enable sorting — it would reorder ten rows of a hundred and present that as "sorted". Enable
 * `sortValue` only where the page holds the complete dataset. Server sorting needs an API change
 * and is out of scope for the presentation layer.
 *
 * <p><strong>Loading.</strong> `loading` renders placeholder rows in the table's own shape and marks
 * the table busy; a single hidden status line announces it once.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  rowHref,
  loading = false,
  loadingRows = 5,
  density = 'comfortable',
  renderMobileRow,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<SortState>(null)
  const isWide = useMediaQuery('(min-width: 768px)')
  const stacked = Boolean(renderMobileRow) && !isWide
  const spacing = DENSITY[density]

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows
    const factor = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => factor * compare(column.sortValue!(a), column.sortValue!(b)))
  }, [rows, columns, sort])

  if (!loading && !rows.length && empty) return <>{empty}</>

  const loadingAnnouncement = loading && (
    <p role="status" className="sr-only">
      {t('common:status.loading')}
    </p>
  )

  if (stacked) {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
        {loadingAnnouncement}
        {loading ? (
          <SkeletonList rows={Math.min(loadingRows, 4)} />
        ) : (
          <ul aria-label={caption} className="divide-y divide-border">
            {sortedRows.map((row) => {
              const href = rowHref?.(row)
              return (
                <li key={rowKey(row)}>
                  {href ? (
                    <Link
                      to={href}
                      className="block px-4 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring motion-reduce:transition-none"
                    >
                      {renderMobileRow!(row)}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{renderMobileRow!(row)}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'ascending' }
      if (current.direction === 'ascending') return { key, direction: 'descending' }
      return null
    })
  }

  function followRowLink(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as Element).closest(INTERACTIVE)) return
    // Selecting text in a row is not a request to leave the page.
    if (window.getSelection?.()?.toString()) return
    event.currentTarget.querySelector<HTMLAnchorElement>('a[data-row-link]')?.click()
  }

  return (
    <div className={cn('max-w-full overflow-x-auto rounded-lg border border-border bg-surface', className)}>
      {loadingAnnouncement}
      <table className="w-full min-w-max border-collapse text-start text-body" aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((column) => {
              const sorted = sort?.key === column.key ? sort.direction : undefined
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortValue ? (sorted ?? 'none') : undefined}
                  className={cn(
                    // Sentence case at the label role. Forced capitals cost Somali headers — which
                    // run longer — real width, and read as shouting at table density.
                    'whitespace-nowrap text-label text-foreground-secondary',
                    spacing.head,
                    column.align === 'end' ? 'text-end' : 'text-start',
                    column.className,
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        '-mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                        sorted && 'text-foreground',
                      )}
                    >
                      {column.header}
                      {/* Direction is announced by aria-sort on the header; the chevron is visual. */}
                      <Icon
                        name="chevronDown"
                        className={cn(
                          'size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
                          sorted === 'ascending' && 'rotate-180',
                          !sorted && 'opacity-40',
                        )}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading
            ? Array.from({ length: loadingRows }, (_, i) => (
                <tr key={`loading-${i}`} aria-hidden="true">
                  {columns.map((column, c) => (
                    <td key={column.key} className={spacing.cell}>
                      <Skeleton className={cn('h-3.5', c === 0 ? 'w-40' : 'w-20')} />
                    </td>
                  ))}
                </tr>
              ))
            : sortedRows.map((row) => {
                const href = rowHref?.(row)
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={href ? followRowLink : undefined}
                    className={cn(
                      'transition-colors motion-reduce:transition-none',
                      href && 'cursor-pointer hover:bg-surface-muted',
                    )}
                  >
                    {columns.map((column) => {
                      const content = column.render(row)
                      const cellClass = cn(
                        'text-foreground',
                        spacing.cell,
                        column.align === 'end' && 'text-end tabular-nums',
                        column.className,
                      )
                      if (column.primary) {
                        return (
                          <th key={column.key} scope="row" className={cn(cellClass, 'text-start font-semibold')}>
                            {href ? (
                              <Link
                                to={href}
                                data-row-link=""
                                className="rounded-sm hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                              >
                                {content}
                              </Link>
                            ) : (
                              content
                            )}
                          </th>
                        )
                      }
                      return (
                        <td key={column.key} className={cellClass}>
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
        </tbody>
      </table>
    </div>
  )
}
