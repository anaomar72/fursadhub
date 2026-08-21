import { z } from 'zod'
import { passwordSchema } from '../../../lib/validation/common'

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'validation:field.required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'validation:password.mismatch',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
