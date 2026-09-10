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

/** The company-size BANDS the backend accepts. Never an exact headcount (Backend Phase B2). */
export const COMPANY_SIZE_RANGES = [
  'SIZE_1_10',
  'SIZE_11_50',
  'SIZE_51_200',
  'SIZE_201_500',
  'SIZE_501_1000',
  'SIZE_1001_5000',
  'SIZE_5001_PLUS',
] as const

/**
 * Mirrors `PublicLinkPolicy` server-side: an absolute `http`/`https` URL with a host, or nothing.
 *
 * <p>The scheme restriction is the security-relevant half — `javascript:`, `data:` and `file:` are
 * all rejected by requiring one of the two web schemes rather than by trying to enumerate dangerous
 * ones. `URL` is the browser's own RFC 3986 parser, which is the same choice the backend made in
 * using `java.net.URI`; a regex loose enough to accept every real URL accepts malformed ones too.
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
    { message: 'organization:profile.errors.invalidUrl' },
  )
  .optional()

/**
 * The organization's editable profile, widened for the Backend Phase B2 fields.
 *
 * <p>The four ORIGINAL fields (`name`, `registrationNumber`, `website`, `description`) are
 * full-replacement server-side and are always submitted. The B2 fields below are presence-aware,
 * and `buildOrganizationProfilePayload` decides per field whether to omit, clear or set — see
 * `lib/validation/patchField.ts`.
 */
export const updateOrganizationSchema = z.object({
  name: requiredString(),
  registrationNumber: z.string().trim().max(120, 'validation:field.tooLong').optional(),
  website: publicLink,
  description: z.string().trim().max(2000, 'validation:field.tooLong').optional(),

  // ---------------------------------------------------------------- Backend Phase B2
  industry: z.string().trim().max(120, 'validation:field.tooLong').optional(),
  city: z.string().trim().max(120, 'validation:field.tooLong').optional(),
  countryCode: z
    .union([z.string().trim().regex(/^[A-Za-z]{2}$/, 'organization:profile.errors.invalidCountry'), z.literal('')])
    .optional(),
  shortDescription: z.string().trim().max(200, 'validation:field.tooLong').optional(),
  companySizeRange: z.enum(['', ...COMPANY_SIZE_RANGES]),
  /** `''` means "not stated". The backend's own bound is 1800–2200 plus "not in the future". */
  foundedYear: z.union([z.literal(''), z.number().int().min(1800).max(2200)]),
  linkedinUrl: publicLink,
  xUrl: publicLink,
  instagramUrl: publicLink,
  youtubeUrl: publicLink,
})

export type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>
