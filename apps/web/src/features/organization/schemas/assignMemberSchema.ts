import { z } from 'zod'
import { emailSchema } from '../../../lib/validation/common'

export const assignMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR']),
})

export type AssignMemberFormValues = z.infer<typeof assignMemberSchema>
