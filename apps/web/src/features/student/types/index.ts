import type { PublicOpportunityResponse } from '../../opportunities/types'

export interface StudentProfileResponse {
  userId: string
  fullName: string
  phone: string | null
}

export interface StudentEnrollmentResponse {
  id: string
  universityId: string
  departmentId: string
  studentNumber: string
  program: string
  academicYear: string
  verificationStatus: string
}

export interface ChallengeResponse {
  code: string
  expiresAt: string
}

/**
 * One entry in the student's Saved Internships list (Backend Phase B4).
 *
 * `opportunity` is the same public representation the discovery endpoints return, including the B3
 * enrichment (compensation, skills, perks, hoursPerWeek) — the saved list can never expose more
 * than `GET /public/opportunities/{id}` would.
 */
export interface SavedOpportunityResponse {
  savedAt: string
  opportunity: PublicOpportunityResponse
}

/**
 * Which of the requested opportunities the signed-in student has saved.
 *
 * Ids only, deliberately: the caller already holds the opportunities, and keeping personalization
 * in this authenticated call is what lets the public opportunity endpoints stay cacheable.
 */
export interface SavedOpportunityStatusResponse {
  savedOpportunityIds: string[]
}
