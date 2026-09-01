import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

export const createUniversitySchema = z.object({
  name: requiredString(),
  city: z.string().trim().optional(),
  registrationNumber: z.string().trim().optional(),
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

export type CreateUniversityFormValues = z.infer<typeof createUniversitySchema>

export const updateUniversitySchema = createUniversitySchema

export type UpdateUniversityFormValues = z.infer<typeof updateUniversitySchema>
