/**
 * The author's real FursadHub role, as the SERVER derived it — one value per role in CLAUDE.md
 * section 23. Never chosen in the browser: the submission payload carries no role field at all.
 */
export type TestimonialAuthorRole =
  | 'STUDENT'
  | 'ORGANIZATION_ADMIN'
  | 'RECRUITER'
  | 'ORGANIZATION_SUPERVISOR'
  | 'UNIVERSITY_ADMIN'
  | 'DEPARTMENT_COORDINATOR'
  | 'UNIVERSITY_SUPERVISOR'
  | 'SUPER_ADMIN'
  | 'VERIFICATION_OFFICER'

/** The broad group an author speaks for. Always present, including on pre-derivation rows. */
export type TestimonialAudience = 'STUDENT' | 'ORGANIZATION' | 'UNIVERSITY' | 'PLATFORM'

export type TestimonialStatus = 'SUBMITTED' | 'PUBLISHED' | 'REJECTED'

/** What the public endpoint returns. Deliberately carries no account or moderation detail. */
export interface PublicTestimonial {
  id: string
  authorDisplayName: string
  /**
   * OPTIONAL because the API omits it for a testimonial written before roles were derived (the API
   * serialises with non-null inclusion). Absent means "no verified role on record", and the card
   * falls back to `authorAudience` rather than inventing a job title.
   */
  authorRole?: TestimonialAuthorRole | null
  authorAudience: TestimonialAudience
  /** The institution's name as it stood at submission. Absent for platform staff and for students
   * whose enrollment FursadHub has not verified. */
  authorAffiliation?: string | null
  body: string
  /**
   * The author's 1-5 rating. OPTIONAL because the API omits it entirely for a testimonial written
   * before ratings existed. Absent means unrated, and an unrated card shows no stars rather than
   * an invented score.
   */
  rating?: number | null
}

/** The author's own view of what they submitted, including the moderation outcome. */
export interface Testimonial extends PublicTestimonial {
  status: TestimonialStatus
  submittedAt: string
  moderatedAt: string | null
  moderationNote: string | null
}

/**
 * How the signed-in user would be attributed. Read-only and display-only — the value that reaches
 * the published row is resolved again server-side at submission, so editing this in the browser
 * changes one person's own screen and nothing that is published.
 */
export interface TestimonialAuthorContext {
  eligible: boolean
  authorRole?: TestimonialAuthorRole | null
  authorAudience?: TestimonialAudience | null
  authorAffiliation?: string | null
}

/** Exactly what an author supplies. No role, no affiliation — those are not theirs to choose. */
export interface SubmitTestimonialInput {
  authorDisplayName: string
  body: string
  /** Required for every new submission. */
  rating: number
}
