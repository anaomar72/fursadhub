import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

export const profileSchema = z.object({
  fullName: requiredString(),
  phone: z.string().trim().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
