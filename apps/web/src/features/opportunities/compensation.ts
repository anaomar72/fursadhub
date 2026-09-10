import type { TFunction } from 'i18next'
import type { CompensationResponse, CompensationType } from './types'

/** The four compensation types, in the order the backend's enum declares them. */
export const COMPENSATION_TYPES: CompensationType[] = ['UNPAID', 'FIXED', 'RANGE', 'NEGOTIABLE']

/**
 * Whether this compensation type carries an amount at all.
 *
 * <p>Mirrors `Compensation.of` server-side: `UNPAID` must carry no amount, currency or period;
 * `FIXED` requires exactly one amount; `RANGE` requires both bounds; `NEGOTIABLE` may carry an
 * indicative amount or none. Everything the form shows or hides derives from this one answer, so a
 * type switch cannot leave the two out of step.
 */
export function acceptsAmount(type: CompensationType): boolean {
  return type === 'FIXED' || type === 'RANGE' || type === 'NEGOTIABLE'
}

/** Whether the type requires an upper bound as well as a lower one. */
export function acceptsMaximum(type: CompensationType): boolean {
  return type === 'RANGE' || type === 'NEGOTIABLE'
}

/**
 * Formats an amount for display.
 *
 * <p>Amounts arrive as decimal STRINGS because they are `NUMERIC(12,2)` server-side; parsing one
 * into a JS `number` would reintroduce exactly the binary rounding error the backend avoids. So the
 * digits are formatted through `Intl` only for grouping and currency presentation, and any value
 * that does not parse cleanly falls back to the raw string rather than showing `NaN`.
 */
function formatAmount(amount: string, currencyCode: string | null | undefined, locale: string): string {
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) return currencyCode ? `${currencyCode} ${amount}` : amount

  try {
    return new Intl.NumberFormat(locale === 'so' ? 'so-SO' : 'en', {
      style: currencyCode ? 'currency' : 'decimal',
      currency: currencyCode ?? undefined,
      maximumFractionDigits: 2,
      // Whole amounts read better without ".00"; a value with cents keeps them.
      minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
    }).format(parsed)
  } catch {
    return currencyCode ? `${currencyCode} ${amount}` : amount
  }
}

/**
 * One line describing what an internship pays, in the current language.
 *
 * <p>Returns null when the organization has said NOTHING about pay — which is deliberately
 * different from `UNPAID`. A blank field means unknown; only an explicit `UNPAID` means unpaid, and
 * conflating the two would misrepresent an offer (see `Compensation` in the API).
 */
export function formatCompensation(
  compensation: CompensationResponse | null | undefined,
  t: TFunction,
  locale: string,
): string | null {
  if (!compensation) return null

  const { type, currencyCode, minimumAmount, maximumAmount, period } = compensation

  if (type === 'UNPAID') return t('opportunities:compensation.unpaid')

  if (!minimumAmount) {
    // NEGOTIABLE with no indicative figure — the only type that can legitimately reach here.
    return t('opportunities:compensation.negotiable')
  }

  const low = formatAmount(minimumAmount, currencyCode, locale)
  const range = maximumAmount ? `${low} – ${formatAmount(maximumAmount, currencyCode, locale)}` : low
  const withPeriod = period ? t(`opportunities:compensation.periodValues.${period}`, { amount: range }) : range

  return type === 'NEGOTIABLE' ? t('opportunities:compensation.negotiableFrom', { amount: withPeriod }) : withPeriod
}
