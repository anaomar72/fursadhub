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

/**
 * Mirrors `PublicLinkPolicy` server-side — an absolute `http`/`https` URL with a host, or nothing.
 * The scheme restriction rejects `javascript:`, `data:` and `file:` by construction.
 */
const publicLink = z
  .string()
  .trim()
  .max(255, 'validation:field.tooLong')
  .refine(
    (value) => {
      if (!value) return true
      try {
        const parsed = new URL(value)
        return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !!parsed.hostname
      } catch {
        return false
      }
    },
    { message: 'university:profile.errors.invalidUrl' },
  )
  .optional()

/**
 * The university's editable profile, widened for the two Backend Phase B2 fields.
 *
 * <p>Smaller than the organization's on purpose — industry, company size and founded year are
 * organization concepts that B2 deliberately did not mirror onto a university.
 */
export const updateUniversitySchema = z.object({
  name: requiredString(),
  city: z.string().trim().max(120, 'validation:field.tooLong').optional(),
  registrationNumber: z.string().trim().max(120, 'validation:field.tooLong').optional(),
  website: publicLink,
  description: z.string().trim().max(2000, 'validation:field.tooLong').optional(),

  // ---------------------------------------------------------------- Backend Phase B2
  countryCode: z
    .union([z.string().trim().regex(/^[A-Za-z]{2}$/, 'university:profile.errors.invalidCountry'), z.literal('')])
    .optional(),
  /**
   * An institution-managed address such as `careers@`, never a staff member's login address —
   * nothing derives it from `users.email`, it exists only because it is set here.
   */
  publicContactEmail: z
    .union([z.string().trim().email('university:profile.errors.invalidEmail').max(320), z.literal('')])
    .optional(),
})

export type UpdateUniversityFormValues = z.infer<typeof updateUniversitySchema>
