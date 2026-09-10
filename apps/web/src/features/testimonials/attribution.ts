import type { TFunction } from 'i18next'
import type { TestimonialAudience, TestimonialAuthorRole } from './types'

/**
 * How a testimonial author is described in words, in whichever language the reader chose.
 *
 * <p>One implementation, used by the public wall, the author's own form and the moderation queue, so
 * a quote cannot be labelled one way on the home page and another way in the console.
 *
 * <p>The rule this file exists to enforce: <b>a role is never softened into an audience</b>. A
 * recruiter reads as "Recruiter", a coordinator as "Department Coordinator" — never as "Student" and
 * never as the vaguer "Organization" or "University" when the precise role is known. The broad
 * audience wording is reached only when {@code authorRole} is genuinely absent, which happens only
 * for testimonials written before the server derived roles at all.
 */

export interface TestimonialAttributionSource {
  authorRole?: TestimonialAuthorRole | null
  authorAudience: TestimonialAudience
  authorAffiliation?: string | null
}

/** FursadHub's own staff. Their quotes are labelled as the platform's, never as a customer's. */
const PLATFORM_ROLES: readonly TestimonialAuthorRole[] = ['SUPER_ADMIN', 'VERIFICATION_OFFICER']

export function isPlatformRole(role: TestimonialAuthorRole | null | undefined): boolean {
  return !!role && PLATFORM_ROLES.includes(role)
}

/**
 * The role alone: "Recruiter", "Department Coordinator", "Verification Officer".
 *
 * <p>Falls back to the audience wording ("Organization", "University") only for a pre-derivation
 * row, where no more precise claim has ever been verified.
 */
export function testimonialRoleLabel(t: TFunction, source: TestimonialAttributionSource): string {
  // `common:roles` is the product-wide role vocabulary, shared with the account identity menu, so a
  // recruiter is worded identically under their quote and under their own name in the header.
  return source.authorRole
    ? t(`common:roles.${source.authorRole}`)
    : t(`common:testimonials.audiences.${source.authorAudience}`)
}

/**
 * The full line under the author's name: "Recruiter at Acme Ltd", "Super Admin, FursadHub",
 * "Student".
 *
 * <p>An institution is named only when the server actually supplied one — it is a snapshot of a
 * verified membership or a verified enrollment, so its absence means FursadHub has nothing it is
 * prepared to state, and the line is simply shorter.
 */
export function testimonialAttribution(t: TFunction, source: TestimonialAttributionSource): string {
  const role = testimonialRoleLabel(t, source)

  // Platform staff carry no tenant, and are always named as FursadHub's own so a reader cannot
  // mistake an internal voice for a customer's endorsement.
  if (isPlatformRole(source.authorRole)) {
    return t('common:testimonials.attribution.platform', { role })
  }

  const institution = source.authorAffiliation?.trim()
  return institution
    ? t('common:testimonials.attribution.atInstitution', { role, institution })
    : role
}
