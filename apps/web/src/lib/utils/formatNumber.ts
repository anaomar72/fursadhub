import i18n from '../i18n'

/** Locale-aware digit grouping for counts/metrics, so Somali readers don't silently get
 * whatever grouping the browser's own locale happens to use. */
export function formatNumber(value: number): string {
  const locale = i18n.resolvedLanguage ?? 'en'
  return value.toLocaleString(locale)
}
