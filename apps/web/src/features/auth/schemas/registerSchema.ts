import { z } from 'zod'
import { emailSchema, passwordSchema } from '../../../lib/validation/common'

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'validation:field.required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation:password.mismatch',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
