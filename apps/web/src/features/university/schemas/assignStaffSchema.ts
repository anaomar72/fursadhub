import { z } from 'zod'
import { emailSchema } from '../../../lib/validation/common'

export const assignStaffSchema = z.object({
  email: emailSchema,
  role: z.enum(['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR']),
  departmentIds: z.array(z.string()),
})

export type AssignStaffFormValues = z.infer<typeof assignStaffSchema>
