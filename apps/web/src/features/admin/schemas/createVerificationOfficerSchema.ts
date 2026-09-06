import { z } from 'zod'
import { emailSchema, passwordSchema, requiredString } from '../../../lib/validation/common'
import { usernameSchema } from '../../../lib/validation/username'

/**
 * Creating a managed verification officer (Backend Phase B5.6).
 *
 * There is no `role` field, mirroring the API: `POST /admin/verification-officers` names the role in
 * the path and assigns it server-side, so `SUPER_ADMIN` is not expressible here. That absence is the
 * point — a field that does not exist cannot be validated wrongly or forgotten in a later change.
 *
 * `displayName` is required, unlike the institution staff form where it is optional: the platform
 * console has no membership record to fall back on, so an officer with no name would show as an
 * email address alone.
 */
export const createVerificationOfficerSchema = z
  .object({
    displayName: requiredString().max(255, 'validation:field.tooLong'),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'validation:field.required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation:password.mismatch',
    path: ['confirmPassword'],
  })

export type CreateVerificationOfficerFormValues = z.infer<typeof createVerificationOfficerSchema>

/** Assigning a username to an officer who predates Backend Phase B5.6. */
export const assignOfficerUsernameSchema = z.object({
  username: usernameSchema,
})

export type AssignOfficerUsernameFormValues = z.infer<typeof assignOfficerUsernameSchema>

/**
 * Setting or replacing an officer's display name (Backend Phase B5.6).
 *
 * Replacement only — there is no clear. `requiredString()` trims first, so whitespace alone is
 * rejected here rather than being sent as a name the server would refuse anyway.
 */
export const changeOfficerDisplayNameSchema = z.object({
  displayName: requiredString().max(255, 'validation:field.tooLong'),
})

export type ChangeOfficerDisplayNameFormValues = z.infer<typeof changeOfficerDisplayNameSchema>
