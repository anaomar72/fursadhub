import { apiFetch } from '../../../lib/api/client'
import type { ChallengeResponse, StudentEnrollmentResponse, StudentProfileResponse } from '../types'
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
