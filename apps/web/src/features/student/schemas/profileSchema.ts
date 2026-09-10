import { z } from 'zod'
import { requiredString } from '../../../lib/validation/common'

export const profileSchema = z.object({
  fullName: requiredString().max(255),
  phone: z.string().trim().max(40).optional(),
  headline: z.string().trim().max(160).optional(),
  summary: z.string().trim().max(3000).optional(),
  city: z.string().trim().max(120).optional(),
  countryCode: z.string().regex(/^$|^[A-Z]{2}$/, 'common:professional.countryError').optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(25).optional(),
  linkedinUrl: professionalUrl(),
  githubUrl: professionalUrl(),
  portfolioUrl: professionalUrl(),
})

function professionalUrl() {
  return z.string().trim().max(500).refine((value) => {
    if (!value) return true
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password } catch { return false }
  }, 'common:professional.urlError').optional()
}

export type ProfileFormValues = z.infer<typeof profileSchema>
