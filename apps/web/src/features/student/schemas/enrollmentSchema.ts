import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

export const enrollmentSchema = z.object({
  universityId: requiredString(),
  departmentId: requiredString(),
  studentNumber: requiredString(),
  program: requiredString(),
  academicYear: requiredString(),
})

export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>
