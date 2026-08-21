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

/** Mirrors the backend's PasswordPolicy (apps/api .../identity/domain/PasswordPolicy.java). */
export const passwordSchema = z
  .string()
  .min(1, 'validation:field.required')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,100}$/, 'validation:password.weak')
