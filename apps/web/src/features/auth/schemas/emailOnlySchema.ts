import { z } from 'zod'
import { emailSchema } from '../../../lib/validation/common'

/** Shared by resend-verification and forgot-password — both forms are just one email field. */
export const emailOnlySchema = z.object({
  email: emailSchema,
})

export type EmailOnlyFormValues = z.infer<typeof emailOnlySchema>
