import { apiFetch } from '../../../lib/api/client'
import type {
  ChallengeResponse,
  SavedOpportunityResponse,
  SavedOpportunityStatusResponse,
  StudentEnrollmentResponse,
  StudentProfileResponse,
} from '../types'
import type { PageResponse } from '../../opportunities/types'
import type { VerificationCaseResponse } from '../../university/types'

export function getMyProfile() {
  return apiFetch<StudentProfileResponse>('/students/me/profile', { method: 'GET' })
}

export function saveMyProfile(input: { fullName: string; phone?: string }) {
  return apiFetch<StudentProfileResponse>('/students/me/profile', { method: 'PUT', body: input })
}

export function getMyEnrollment() {
  return apiFetch<StudentEnrollmentResponse>('/students/me/enrollment', { method: 'GET' })
}

interface EnrollmentInput {
  universityId: string
  departmentId: string
  studentNumber: string
  program: string
  academicYear: string
}

export function claimEnrollment(input: EnrollmentInput) {
  return apiFetch<StudentEnrollmentResponse>('/students/me/enrollment', { method: 'POST', body: input })
}

export function updateEnrollment(input: EnrollmentInput) {
  return apiFetch<StudentEnrollmentResponse>('/students/me/enrollment', { method: 'PUT', body: input })
}

export function submitVerification() {
  return apiFetch<{ id: string; status: string }>('/students/me/enrollment/submit-verification', { method: 'POST' })
}

export function issueChallenge() {
  return apiFetch<ChallengeResponse>('/students/me/verification/challenges', { method: 'POST' })
}

export function getMyCase() {
  return apiFetch<VerificationCaseResponse>('/students/me/verification', { method: 'GET' })
}

// ---------------------------------------------------------------- saved internships (Backend Phase B4)

/**
 * Bookmarks an internship for the signed-in student. Idempotent — saving something already saved
 * succeeds without creating a second bookmark, so a double-clicked button is harmless.
 *
 * Rejects with 404 OPPORTUNITY_NOT_FOUND if the opportunity is not currently publicly discoverable,
 * which is the same answer the public detail endpoint gives; it never reveals that a hidden
 * opportunity exists.
 */
export function saveOpportunity(opportunityId: string) {
  return apiFetch<void>(`/students/me/saved-opportunities/${opportunityId}`, { method: 'POST' })
}

/**
 * Removes the bookmark. Idempotent, and deliberately NOT gated on visibility: a student can tidy an
 * entry whose opportunity is no longer public, which would otherwise be stranded.
 */
export function unsaveOpportunity(opportunityId: string) {
  return apiFetch<void>(`/students/me/saved-opportunities/${opportunityId}`, { method: 'DELETE' })
}

/**
 * The student's saved internships, newest save first.
 *
 * Only bookmarks whose opportunity is CURRENTLY publicly discoverable are returned, and the totals
 * describe that visible set — a saved item whose organization is suspended is retained server-side
 * but absent here, and reappears on its own if the organization is re-verified.
 */
export function listSavedOpportunities(params: { page?: number; size?: number } = {}) {
  const query = new URLSearchParams()
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const suffix = query.toString() ? `?${query}` : ''
  return apiFetch<PageResponse<SavedOpportunityResponse>>(`/students/me/saved-opportunities${suffix}`, {
    method: 'GET',
  })
}

/**
 * Which of the given opportunities the signed-in student has saved — one request for a whole page
 * of cards, so the public opportunity endpoints can stay public and cacheable rather than varying
 * per viewer. At most 50 ids per call; duplicates are handled server-side.
 */
export function getSavedOpportunityStatus(opportunityIds: string[]) {
  const query = new URLSearchParams()
  opportunityIds.forEach((id) => query.append('opportunityId', id))
  return apiFetch<SavedOpportunityStatusResponse>(`/students/me/saved-opportunities/status?${query}`, {
    method: 'GET',
  })
}
