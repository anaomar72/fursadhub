import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

/**
 * Mirrors the backend's Bean Validation + OpportunityFieldValidation cross-field rules
 * (apps/api .../opportunity/application/OpportunityFieldValidation.java) so invalid input is
 * caught before submit — the backend remains the authoritative check (CLAUDE.md section 6/11).
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

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>
