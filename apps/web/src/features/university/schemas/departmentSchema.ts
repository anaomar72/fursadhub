import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

export const createDepartmentSchema = z.object({
  name: requiredString().max(255, 'validation:field.tooLong'),
  code: requiredString().max(40, 'validation:field.tooLong'),
})

export type CreateDepartmentFormValues = z.infer<typeof createDepartmentSchema>
