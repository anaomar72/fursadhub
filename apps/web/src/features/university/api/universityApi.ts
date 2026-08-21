import { apiFetch } from '../../../lib/api/client'
import type {
  DepartmentResponse,
  MyMembershipResponse,
  StaffMemberResponse,
  StudentRowResponse,
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

export function getMyMembership() {
  return apiFetch<MyMembershipResponse>('/university-memberships/me', { method: 'GET' })
}

export function listStaff(universityId: string) {
  return apiFetch<StaffMemberResponse[]>(`/universities/${universityId}/staff`, { method: 'GET' })
}

export function assignStaff(universityId: string, input: { email: string; role: UniversityRole; departmentIds: string[] }) {
  return apiFetch<StaffMemberResponse>(`/universities/${universityId}/staff`, { method: 'POST', body: input })
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

export function consumeChallenge(universityId: string, caseId: string, code: string) {
  return apiFetch<MessageResponse>(`/universities/${universityId}/verification-cases/${caseId}/consume-challenge`, {
    method: 'POST',
    body: { code },
  })
}
