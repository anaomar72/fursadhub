import { z } from 'zod'
import { emailSchema, requiredString } from '../../../lib/validation/common'

export const loginSchema = z.object({
  email: emailSchema,
  password: requiredString(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
