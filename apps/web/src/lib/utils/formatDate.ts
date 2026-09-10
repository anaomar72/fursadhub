import i18n from '../i18n'

/**
 * Renders an API date (`LocalDate` "2026-05-01") or timestamp (`Instant`) in the reader's current
 * language, so a Somali reader gets Somali month names without every page repeating the same
 * `toLocaleDateString` call — or, as happened before this existed, quietly falling back to
 * `value.slice(0, 10)`.
 *
 * <p>Date-only values are parsed as plain calendar dates rather than UTC instants: `new Date('2026-05-01')`
 * is midnight UTC and renders as the previous day west of Greenwich, which would silently shift
 * every deadline and start date the product shows.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const locale = i18n.resolvedLanguage ?? 'en'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = dateOnly ? parseCalendarDate(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Date plus time, for events where the hour matters (a scheduled defense, a response deadline). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const locale = i18n.resolvedLanguage ?? 'en'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Time of day only, for values like a verification challenge's expiry. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  const locale = i18n.resolvedLanguage ?? 'en'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/**
 * A month bucket's axis label ("Mar") and its long form ("March 2026") for tooltips and tables.
 *
 * <p>Formatted in UTC to match how the bucket was computed — rendering a UTC month boundary in the
 * reader's local zone would label January's bucket "December" for anyone west of Greenwich.
 */
export function formatMonth(date: Date, style: 'short' | 'long' = 'short'): string {
  const locale = i18n.resolvedLanguage ?? 'en'
  return date.toLocaleDateString(
    locale,
    style === 'short'
      ? { month: 'short', timeZone: 'UTC' }
      : { month: 'long', year: 'numeric', timeZone: 'UTC' },
  )
}

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
