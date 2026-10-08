import { z } from 'zod'

/**
 * Shared Zod primitives reused across feature form schemas so validation
 * rules (and their translated messages) stay consistent product-wide.
 * Feature-specific schemas live under features/<feature>/schemas.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'validation:email.required')
  .email('validation:email.invalid')
  .toLowerCase()

export const requiredString = (messageKey = 'validation:field.required') =>
  z.string().trim().min(1, messageKey)

/**
 * The password policy as separate, checkable rules — what the registration form shows as a live
 * checklist. Together they are exactly `PasswordPolicy.REGEX` on the server
 * (`^(?=.*[A-Za-z])(?=.*\d).{8,100}$`) and the regex in {@link passwordSchema} below;
 * `tests/lib/passwordRules.test.ts` holds the two in agreement. The 100-character ceiling is part of
 * `length` but not advertised: nobody types that much, and listing it would only add noise.
 */
export const PASSWORD_RULES = {
  length: (value: string) => value.length >= 8 && value.length <= 100,
  letter: (value: string) => /[A-Za-z]/.test(value),
  number: (value: string) => /\d/.test(value),
} as const

export type PasswordRule = keyof typeof PASSWORD_RULES

/** Mirrors the backend's PasswordPolicy (apps/api .../identity/domain/PasswordPolicy.java). */
export const passwordSchema = z
  .string()
  .min(1, 'validation:field.required')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,100}$/, 'validation:password.weak')
