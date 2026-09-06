import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

/**
 * One identifier field for both account types (Backend Phase B5.5).
 *
 * Self-service accounts sign in with their email; institution-managed staff sign in with the
 * username their administrator assigned. A single field can serve both because `@` is forbidden in a
 * username, so the two are always distinguishable — see `toLoginPayload`.
 *
 * Deliberately not validated as an email any more: that would reject every managed staff member.
 */
export const loginSchema = z.object({
  identifier: requiredString(),
  password: requiredString(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

/**
 * Routes the typed identifier to the right API field.
 *
 * The API takes `email` OR `username` and rejects both together, so this must send exactly one.
 * Containing `@` is the test: usernames cannot contain it, and an email address always does.
 */
export function toLoginPayload(values: LoginFormValues) {
  const identifier = values.identifier.trim()
  return identifier.includes('@')
    ? { email: identifier, password: values.password }
    : { username: identifier, password: values.password }
}
