import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

export const createOrganizationSchema = z.object({
  name: requiredString(),
  type: z.enum(['COMPANY', 'NGO', 'GOVERNMENT', 'OTHER']),
  registrationNumber: z.string().trim().optional(),
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z.object({
  name: requiredString(),
  registrationNumber: z.string().trim().optional(),
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

export type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>
