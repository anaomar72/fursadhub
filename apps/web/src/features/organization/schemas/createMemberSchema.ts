import { z } from 'zod'
import { emailSchema, passwordSchema } from '../../../lib/validation/common'

export const createMemberSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'validation:field.required'),
    role: z.enum(['RECRUITER', 'ORGANIZATION_SUPERVISOR']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation:password.mismatch',
    path: ['confirmPassword'],
  })

export type CreateMemberFormValues = z.infer<typeof createMemberSchema>
