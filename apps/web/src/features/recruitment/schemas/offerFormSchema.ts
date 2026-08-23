import { z } from 'zod'

/**
 * Client-side offer validation mirroring the backend's rules (CLAUDE.md Phase 4 section 15).
 * This is UX only — the backend re-validates every one of these independently.
 */
export const offerFormSchema = z
  .object({
    startDate: z.string().min(1, { message: 'startDateRequired' }),
    endDate: z.string().min(1, { message: 'endDateRequired' }),
    responseDeadline: z.string().min(1, { message: 'deadlineRequired' }),
    location: z.string().max(255).optional(),
    details: z.string().max(2000).optional(),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: 'dateOrder',
    path: ['endDate'],
  })
  .refine((values) => values.responseDeadline <= values.startDate, {
    message: 'deadlineAfterStart',
    path: ['responseDeadline'],
  })

export type OfferFormValues = z.infer<typeof offerFormSchema>
