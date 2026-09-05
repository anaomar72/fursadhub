import { env } from '../../../app/config/env'
import { ApiError, apiFetch } from '../../../lib/api/client'
import { downloadPrivateDocument } from '../../../lib/api/privateDocument'
import { getAccessToken } from '../../../lib/auth/tokenStore'
import type {
  DepartmentResponse,
  MyMembershipResponse,
  PublicUniversityResponse,
  StaffMemberResponse,
  StudentRowResponse,
  TemporaryCredentialResponse,
  UniversityDetailResponse,
  UniversityEvidenceResponse,
  UniversityResponse,
  VerificationCaseResponse,
  UniversityRole,
} from '../types'
import type { MessageResponse } from '../../auth/types'

export function listUniversities() {
  return apiFetch<UniversityResponse[]>('/universities', { method: 'GET' })
}

export function listDepartments(universityId: string) {
  return apiFetch<DepartmentResponse[]>(`/universities/${universityId}/departments`, { method: 'GET' })
}

/** UNIVERSITY_ADMIN only — standing up a new department is a whole-university act. */
export function createDepartment(universityId: string, input: { name: string; code: string }) {
  return apiFetch<DepartmentResponse>(`/universities/${universityId}/departments`, { method: 'POST', body: input })
}

/** UNIVERSITY_ADMIN, or the department's own DEPARTMENT_COORDINATOR. */
export function updateDepartment(universityId: string, departmentId: string, input: { name: string }) {
  return apiFetch<DepartmentResponse>(`/universities/${universityId}/departments/${departmentId}`, {
    method: 'PATCH',
    body: input,
  })
}

export function getMyMembership() {
  return apiFetch<MyMembershipResponse>('/university-memberships/me', { method: 'GET' })
}

// ---------------------------------------------------------------- self-service registration

export function createUniversity(input: {
  name: string
  city?: string
  registrationNumber?: string
  website?: string
  description?: string
}) {
  return apiFetch<UniversityDetailResponse>('/universities', { method: 'POST', body: input })
}

export function getUniversityDetail(universityId: string) {
  return apiFetch<UniversityDetailResponse>(`/universities/${universityId}`, { method: 'GET' })
}

export function updateUniversity(
  universityId: string,
  input: { name: string; city?: string; registrationNumber?: string; website?: string; description?: string },
) {
  return apiFetch<UniversityDetailResponse>(`/universities/${universityId}`, { method: 'PATCH', body: input })
}

export function submitUniversityForVerification(universityId: string) {
  return apiFetch<UniversityDetailResponse>(`/universities/${universityId}/verification/submit`, { method: 'POST' })
}

/**
 * Uploads or replaces the university's registration/accreditation document. PDF only; private,
 * random storage key, never given a URL (CLAUDE.md sections 47-48). Bypasses {@code apiFetch}
 * because a multipart body must let the browser set its own boundary.
 */
export async function uploadUniversityEvidence(universityId: string, file: File): Promise<UniversityEvidenceResponse> {
  const body = new FormData()
  body.append('file', file)

  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/universities/${universityId}/verification/evidence`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    if (errorBody) throw new ApiError(errorBody)
    throw new Error(`Upload failed with status ${response.status}`)
  }
  return (await response.json()) as UniversityEvidenceResponse
}

// ---------------------------------------------------------------- public logo

interface UniversityLogoResponse {
  present: boolean
}

/** Uploads or replaces the university's public logo. `UNIVERSITY_ADMIN` only. */
export async function uploadUniversityLogo(universityId: string, file: File): Promise<UniversityLogoResponse> {
  const body = new FormData()
  body.append('file', file)

  const accessToken = getAccessToken()
  const response = await fetch(`${env.apiBaseUrl}/universities/${universityId}/logo`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    if (errorBody) throw new ApiError(errorBody)
    throw new Error(`Upload failed with status ${response.status}`)
  }
  return (await response.json()) as UniversityLogoResponse
}

/** Public, unauthenticated, cacheable — safe to use directly as an `<img src>`. */
export function universityLogoUrl(universityId: string): string {
  return `${env.apiBaseUrl}/public/universities/${universityId}/logo/document`
}

// ---------------------------------------------------------------- public profile

export function getPublicUniversity(universityId: string) {
  return apiFetch<PublicUniversityResponse>(`/public/universities/${universityId}`, { method: 'GET' })
}

export function listStaff(universityId: string) {
  return apiFetch<StaffMemberResponse[]>(`/universities/${universityId}/staff`, { method: 'GET' })
}

/** Creates a brand-new staff account — the email does not need to belong to an existing user. */
export function createStaff(
  universityId: string,
  input: {
    email: string
    password: string
    confirmPassword: string
    /** Backend Phase B5. Optional — omit it and the staff member simply has no display name. */
    displayName?: string
    role: UniversityRole
    departmentIds: string[]
  },
) {
  return apiFetch<StaffMemberResponse>(`/universities/${universityId}/staff`, { method: 'POST', body: input })
}

export function changeStaffRole(
  universityId: string,
  membershipId: string,
  input: { role: UniversityRole; departmentIds: string[] },
) {
  return apiFetch<StaffMemberResponse>(`/universities/${universityId}/staff/${membershipId}/role`, { method: 'POST', body: input })
}

export function suspendStaff(universityId: string, membershipId: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/staff/${membershipId}/suspend`, { method: 'POST' })
}

export function reactivateStaff(universityId: string, membershipId: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/staff/${membershipId}/reactivate`, { method: 'POST' })
}

/** Server-generates a fresh temporary password, returned exactly once. */
export function resetStaffPassword(universityId: string, membershipId: string) {
  return apiFetch<TemporaryCredentialResponse>(`/universities/${universityId}/staff/${membershipId}/reset-password`, { method: 'POST' })
}

export function revokeStaff(universityId: string, membershipId: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/staff/${membershipId}/revoke`, { method: 'POST' })
}

export function listStudents(universityId: string, departmentId?: string) {
  const query = departmentId ? `?departmentId=${departmentId}` : ''
  return apiFetch<StudentRowResponse[]>(`/universities/${universityId}/students${query}`, { method: 'GET' })
}

export function listVerificationQueue(universityId: string, status?: string) {
  const query = status ? `?status=${status}` : ''
  return apiFetch<VerificationCaseResponse[]>(`/universities/${universityId}/verification-cases${query}`, { method: 'GET' })
}

export function getVerificationCase(universityId: string, caseId: string) {
  return apiFetch<VerificationCaseResponse>(`/universities/${universityId}/verification-cases/${caseId}`, { method: 'GET' })
}

export function beginReview(universityId: string, caseId: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/begin-review`, { method: 'POST' })
}

export function requestMoreEvidence(universityId: string, caseId: string, notes: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/request-more-evidence`, {
    method: 'POST',
    body: { notes },
  })
}

export function approveCase(universityId: string, caseId: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/verify`, { method: 'POST' })
}

export function rejectCase(universityId: string, caseId: string, notes: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/reject`, {
    method: 'POST',
    body: { notes },
  })
}

export function revokeCase(universityId: string, caseId: string, notes: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/revoke`, {
    method: 'POST',
    body: { notes },
  })
}

/**
 * Hands a case this university cannot resolve to the platform.
 *
 * <p>Does NOT change the case's status — the frozen state machine of CLAUDE.md section 30 is
 * untouched. It changes who may act, so a coordinator facing a disputed identity has somewhere to
 * send it, and the university keeps its own access throughout. This is what fills the platform's
 * escalation queue; without it that queue can only ever be empty.
 */
export function escalateCase(universityId: string, caseId: string, notes: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/escalate`, {
    method: 'POST',
    body: { notes },
  })
}

/**
 * The student's private verification evidence, for a scoped university reviewer.
 *
 * <p>Three checks run inside {@code VerificationEvidenceService}: the case belongs to THIS
 * university, the caller holds a reviewing role here, and a coordinator's assigned departments
 * include this enrollment. Organization users have no route to this document at all
 * (CLAUDE.md sections 31, 60).
 */
export function downloadCaseEvidence(universityId: string, caseId: string) {
  return downloadPrivateDocument(
    `/universities/${universityId}/verification-cases/${caseId}/evidence/document`,
  )
}

export function consumeChallenge(universityId: string, caseId: string, code: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/consume-challenge`, {
    method: 'POST',
    body: { code },
  })
}

/**
 * Sets or clears a managed staff member's display name (Backend Phase B5).
 *
 * Only DEPARTMENT_COORDINATOR and UNIVERSITY_SUPERVISOR memberships may be named — the server
 * refuses a university admin's own membership with STAFF_ROLE_NOT_ASSIGNABLE. Pass null to clear.
 */
export function changeStaffDisplayName(universityId: string, membershipId: string, displayName: string | null) {
  return apiFetch<StaffMemberResponse>(`/universities/${universityId}/staff/${membershipId}/display-name`, {
    method: 'POST',
    body: { displayName },
  })
}
