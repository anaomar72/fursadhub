import type { OpportunityFormInput } from './api/opportunityApi'
import { acceptsAmount, acceptsMaximum } from './compensation'
import type { OpportunityFormValues } from './schemas/opportunityFormSchema'
import type { CompensationInput, OpportunityResponse } from './types'

/**
 * Builds the compensation the server will actually be sent, from the compensation type ALONE.
 *
 * <p><strong>This is the whole point of the function.</strong> Hiding a field does not unset the
 * value React Hook Form is still holding for it: a user who fills in "500 USD per month", then
 * switches the type to `UNPAID`, still has `minimumAmount: '500'` in form state behind the now-
 * hidden control. Serialising that would submit an amount on an unpaid internship — which the
 * backend rejects outright (`Compensation.unpaid`), and which on the `NEGOTIABLE` path it would
 * quietly ACCEPT, publishing a figure the organization thought it had removed.
 *
 * <p>So every amount-bearing field is read only when the CURRENT type admits it:
 *
 * <ul>
 *   <li>`UNPAID` carries nothing at all — no amount, no currency, no period.</li>
 *   <li>`FIXED` carries the single amount in `minimumAmount` and never a maximum.</li>
 *   <li>`RANGE` carries both bounds.</li>
 *   <li>`NEGOTIABLE` may carry an indicative amount, and its maximum only alongside a minimum.</li>
 * </ul>
 *
 * <p>Returns `null` for "nothing said about pay" — which the API treats as distinct from `UNPAID`,
 * and which on update means "clear the stored compensation".
 */
export function buildCompensation(values: OpportunityFormValues): CompensationInput | null {
  const type = values.compensationType
  if (!type) return null

  if (!acceptsAmount(type)) {
    return { type }
  }

  const minimumAmount = values.minimumAmount?.trim() || null
  // A maximum is only ever sent for a type that admits one, and only with a minimum beside it.
  const maximumAmount = acceptsMaximum(type) && minimumAmount ? values.maximumAmount?.trim() || null : null

  if (!minimumAmount) {
    // NEGOTIABLE with no figure: currency and period would be rejected without an amount.
    return { type }
  }

  return {
    type,
    minimumAmount,
    maximumAmount,
    currencyCode: values.currencyCode?.trim().toUpperCase() || null,
    period: values.compensationPeriod || null,
  }
}

/**
 * The create/update payload.
 *
 * <p>The eleven ORIGINAL fields use FULL REPLACEMENT server-side — omitting `responsibilities`,
 * `requirements`, `location` or `applicationDeadline` CLEARS them — so every one is submitted, with
 * an emptied field sent as `undefined` to clear it deliberately rather than by omission.
 *
 * <p>The four B3 fields are PRESENCE-AWARE server-side. This form knows about all of them, so it
 * always sends all of them: `null` / `[]` where the organization cleared the field, which is the
 * explicit clear the API defines. A form that sent nothing would preserve stale values the user had
 * just deleted.
 */
export function buildOpportunityPayload(values: OpportunityFormValues): OpportunityFormInput {
  return {
    title: values.title,
    description: values.description,
    responsibilities: values.responsibilities || undefined,
    requirements: values.requirements || undefined,
    mode: values.mode,
    numberOfOpenings: values.numberOfOpenings,
    workMode: values.workMode,
    location: values.location || undefined,
    startDate: values.startDate,
    endDate: values.endDate,
    applicationDeadline: values.applicationDeadline || undefined,

    compensation: buildCompensation(values),
    skills: values.skills,
    perks: values.perks,
    // `''` is the form's "not stated"; it must become an explicit null, never `NaN` or `""`.
    hoursPerWeek: values.hoursPerWeek === '' ? null : values.hoursPerWeek,
  }
}

/** The blank form, for the create page. */
export function emptyOpportunityFormValues(): OpportunityFormValues {
  return {
    title: '',
    description: '',
    responsibilities: '',
    requirements: '',
    mode: 'PUBLIC',
    numberOfOpenings: 1,
    workMode: 'ONSITE',
    location: '',
    startDate: '',
    endDate: '',
    applicationDeadline: '',
    compensationType: '',
    currencyCode: '',
    minimumAmount: '',
    maximumAmount: '',
    compensationPeriod: '',
    skills: [],
    perks: [],
    hoursPerWeek: '',
  }
}

/**
 * Loads a stored opportunity into the form, for the edit page.
 *
 * <p>Absent B3 fields become the form's empty values rather than being left undefined, so an
 * opportunity created before B3 opens with a blank compensation section instead of an uncontrolled
 * input — and saving it without touching that section sends an explicit "still nothing", which is
 * what it already was.
 */
export function toOpportunityFormValues(opportunity: OpportunityResponse): OpportunityFormValues {
  const compensation = opportunity.compensation ?? null

  return {
    title: opportunity.title,
    description: opportunity.description,
    responsibilities: opportunity.responsibilities ?? '',
    requirements: opportunity.requirements ?? '',
    mode: opportunity.mode,
    numberOfOpenings: opportunity.numberOfOpenings,
    workMode: opportunity.workMode,
    location: opportunity.location ?? '',
    startDate: opportunity.startDate,
    endDate: opportunity.endDate,
    applicationDeadline: opportunity.applicationDeadline ?? '',
    compensationType: compensation?.type ?? '',
    currencyCode: compensation?.currencyCode ?? '',
    minimumAmount: compensation?.minimumAmount ?? '',
    maximumAmount: compensation?.maximumAmount ?? '',
    compensationPeriod: compensation?.period ?? '',
    skills: opportunity.skills ?? [],
    perks: opportunity.perks ?? [],
    hoursPerWeek: opportunity.hoursPerWeek ?? '',
  }
}
