import { z } from 'zod'
import { emailSchema, passwordSchema } from '../../../lib/validation/common'
import { usernameSchema } from '../../../lib/validation/username'

export const createStaffSchema = z
  .object({
    /**
     * Backend Phase B5. Optional — the server accepts an omitted display name and the roster then
     * falls back to the email. Nothing is derived from the email local part.
     */
    displayName: z.string().trim().max(255, 'validation:field.tooLong').optional(),
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'validation:field.required'),
    role: z.enum(['DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR']),
    departmentIds: z.array(z.string()).min(1, 'university:staff.errors.departmentsRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation:password.mismatch',
    path: ['confirmPassword'],
  })

export type CreateStaffFormValues = z.infer<typeof createStaffSchema>
