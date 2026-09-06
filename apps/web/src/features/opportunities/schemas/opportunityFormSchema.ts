import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

/** Mirrors `OpportunitySkill` / `OpportunityPerk` server-side. */
export const MAX_SKILLS = 20
export const MAX_SKILL_LENGTH = 60
export const MAX_PERKS = 15
export const MAX_PERK_LENGTH = 80

/** Mirrors `InternshipOpportunity.MIN/MAX_HOURS_PER_WEEK`. */
export const MIN_HOURS_PER_WEEK = 1
export const MAX_HOURS_PER_WEEK = 80

/**
 * An amount as the form holds it: a STRING, never a number.
 *
 * <p>Amounts are `NUMERIC(12,2)` server-side and travel as decimal strings for exactly the reason
 * the API documents — parsing them through a JS `number` reintroduces binary rounding error. Keeping
 * the form value a string also means an emptied field is `''` rather than `NaN`, which is what stops
 * a cleared amount from being serialized as a numeric artifact.
 */
const amountString = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'opportunities:form.errors.amountFormat')

const optionalAmount = z.union([amountString, z.literal('')]).optional()

/**
 * Mirrors the backend's Bean Validation + OpportunityFieldValidation cross-field rules
 * (apps/api .../opportunity/application/OpportunityFieldValidation.java) and, for the Backend Phase
 * B3 additions, `Compensation.of` — so invalid input is caught before submit. The backend remains
 * the authoritative check (CLAUDE.md section 6/11).
 */
export const opportunityFormSchema = z
  .object({
    title: requiredString().max(255, 'validation:field.tooLong'),
    description: requiredString().max(4000, 'validation:field.tooLong'),
    responsibilities: z.string().trim().max(4000, 'validation:field.tooLong').optional(),
    requirements: z.string().trim().max(4000, 'validation:field.tooLong').optional(),
    mode: z.enum(['PUBLIC', 'UNIVERSITY_TARGETED', 'HYBRID']),
    numberOfOpenings: z.number().int().min(1, 'opportunities:form.errors.openingsMin'),
    workMode: z.enum(['ONSITE', 'HYBRID', 'REMOTE']),
    location: z.string().trim().max(255, 'validation:field.tooLong').optional(),
    startDate: requiredString(),
    endDate: requiredString(),
    applicationDeadline: z.string().trim().optional(),

    // ------------------------------------------------------------ Backend Phase B3
    /**
     * `''` is the deliberate "nothing said about pay" value, which the API keeps distinct from an
     * explicit `UNPAID`. It is not a placeholder for UNPAID and must never be coerced into one.
     */
    compensationType: z.enum(['', 'UNPAID', 'FIXED', 'RANGE', 'NEGOTIABLE']),
    currencyCode: z.union([z.string().trim().regex(/^[A-Za-z]{3}$/, 'opportunities:form.errors.currencyFormat'), z.literal('')]).optional(),
    minimumAmount: optionalAmount,
    maximumAmount: optionalAmount,
    compensationPeriod: z.enum(['', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'TOTAL']),

    skills: z.array(z.string().trim().min(1).max(MAX_SKILL_LENGTH)).max(MAX_SKILLS, 'opportunities:form.errors.skillsMax'),
    perks: z.array(z.string().trim().min(1).max(MAX_PERK_LENGTH)).max(MAX_PERKS, 'opportunities:form.errors.perksMax'),

    /** Empty string means "not stated". A number outside 1–80 is refused by the backend too. */
    hoursPerWeek: z.union([z.literal(''), z.number().int().min(MIN_HOURS_PER_WEEK).max(MAX_HOURS_PER_WEEK)]),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: 'opportunities:form.errors.dateOrder',
    path: ['endDate'],
  })
  .refine((values) => values.mode === 'UNIVERSITY_TARGETED' || !!values.applicationDeadline, {
    message: 'opportunities:form.errors.deadlineRequired',
    path: ['applicationDeadline'],
  })
  .refine((values) => !values.applicationDeadline || values.applicationDeadline < values.startDate, {
    message: 'opportunities:form.errors.deadlineBeforeStart',
    path: ['applicationDeadline'],
  })
  // `Compensation.fixed`: an amount is required.
  .refine((values) => values.compensationType !== 'FIXED' || !!values.minimumAmount, {
    message: 'opportunities:form.errors.amountRequired',
    path: ['minimumAmount'],
  })
  // `Compensation.range`: both bounds required, in order.
  .refine((values) => values.compensationType !== 'RANGE' || (!!values.minimumAmount && !!values.maximumAmount), {
    message: 'opportunities:form.errors.rangeRequired',
    path: ['minimumAmount'],
  })
  .refine(
    (values) =>
      !values.minimumAmount || !values.maximumAmount || Number(values.minimumAmount) <= Number(values.maximumAmount),
    { message: 'opportunities:form.errors.rangeOrder', path: ['maximumAmount'] },
  )
  // `Compensation.negotiable`: a maximum requires a minimum.
  .refine((values) => !values.maximumAmount || !!values.minimumAmount, {
    message: 'opportunities:form.errors.maximumNeedsMinimum',
    path: ['minimumAmount'],
  })
  // `Compensation.requireCurrencyAndPeriod`: whenever an amount is present.
  .refine((values) => !values.minimumAmount || !!values.currencyCode, {
    message: 'opportunities:form.errors.currencyRequired',
    path: ['currencyCode'],
  })
  .refine((values) => !values.minimumAmount || !!values.compensationPeriod, {
    message: 'opportunities:form.errors.periodRequired',
    path: ['compensationPeriod'],
  })

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>
