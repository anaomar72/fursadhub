import { z } from 'zod'

export const changeMemberRoleSchema = z.object({
  role: z.enum(['RECRUITER', 'ORGANIZATION_SUPERVISOR']),
})

export type ChangeMemberRoleFormValues = z.infer<typeof changeMemberRoleSchema>
