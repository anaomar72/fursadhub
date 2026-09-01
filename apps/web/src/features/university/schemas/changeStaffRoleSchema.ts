import { z } from 'zod'

export const changeStaffRoleSchema = z.object({
  role: z.enum(['DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR']),
  departmentIds: z.array(z.string()).min(1, 'university:staff.errors.departmentsRequired'),
})

export type ChangeStaffRoleFormValues = z.infer<typeof changeStaffRoleSchema>
