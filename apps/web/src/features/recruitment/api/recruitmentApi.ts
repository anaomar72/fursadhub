import { apiFetch } from '../../../lib/api/client'
import type { MessageResponse } from '../../auth/types'
import type {
  CandidacyResponse,
  CandidacySource,
  CandidateDetailResponse,
  CandidateRowResponse,
  EligibleStudentResponse,
  InternshipOfferResponse,
  NominationResponse,
  OfferAcceptanceResponse,
  ScreeningQuestionResponse,
  ScreeningQuestionType,
  StudentCandidacyResponse,
  StudentNominationResponse,
  TargetRequestResponse,
} from '../types'

// ---------------------------------------------------------------- student

export interface ScreeningAnswerInput {
  questionId: string
  answer: string
}

/**
 * Self-application. Note there is no student id in the payload — the backend takes the applicant
 * from the authenticated session (CLAUDE.md section 12), and the UI must never try to supply one.
 */
export function applyToOpportunity(opportunityId: string, answers: ScreeningAnswerInput[]) {
  return apiFetch<CandidacyResponse>(`/opportunities/${opportunityId}/applications`, {
    method: 'POST',
    body: { answers },
  })
}

export function listMyCandidacies() {
  return apiFetch<StudentCandidacyResponse[]>('/students/me/candidacies', { method: 'GET' })
}

export function getMyCandidacy(candidacyId: string) {
  return apiFetch<StudentCandidacyResponse>(`/students/me/candidacies/${candidacyId}`, { method: 'GET' })
}

export function listMyNominations() {
  return apiFetch<StudentNominationResponse[]>('/students/me/nominations', { method: 'GET' })
}

export function listMyOffers() {
  return apiFetch<InternshipOfferResponse[]>('/students/me/offers', { method: 'GET' })
}

export function acceptNomination(nominationId: string) {
  return apiFetch<CandidacyResponse>(`/nominations/${nominationId}/accept`, { method: 'POST' })
}

export function declineNomination(nominationId: string) {
  return apiFetch<StudentNominationResponse>(`/nominations/${nominationId}/decline`, { method: 'POST' })
}

export function acceptOffer(offerId: string) {
  return apiFetch<OfferAcceptanceResponse>(`/offers/${offerId}/accept`, { method: 'POST' })
}

export function declineOffer(offerId: string) {
  return apiFetch<InternshipOfferResponse>(`/offers/${offerId}/decline`, { method: 'POST' })
}

export function withdrawCandidacy(candidacyId: string) {
  return apiFetch<CandidacyResponse>(`/candidacies/${candidacyId}/withdraw`, { method: 'POST' })
}

// ---------------------------------------------------------------- screening questions

export function listPublicScreeningQuestions(opportunityId: string) {
  return apiFetch<ScreeningQuestionResponse[]>(`/public/opportunities/${opportunityId}/screening-questions`, {
    method: 'GET',
  })
}

export function listScreeningQuestions(opportunityId: string) {
  return apiFetch<ScreeningQuestionResponse[]>(`/opportunities/${opportunityId}/screening-questions`, { method: 'GET' })
}

export function addScreeningQuestion(
  opportunityId: string,
  input: { prompt: string; type: ScreeningQuestionType; required: boolean; choices?: string[] },
) {
  return apiFetch<ScreeningQuestionResponse>(`/opportunities/${opportunityId}/screening-questions`, {
    method: 'POST',
    body: input,
  })
}

export function removeScreeningQuestion(opportunityId: string, questionId: string) {
  return apiFetch<MessageResponse>(`/opportunities/${opportunityId}/screening-questions/${questionId}`, {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------- organization

/** One unified pool; `source` is a filter over it, never a separate pipeline. */
export function listCandidates(opportunityId: string, source?: CandidacySource) {
  const query = source ? `?source=${source}` : ''
  return apiFetch<CandidateRowResponse[]>(`/opportunities/${opportunityId}/candidacies${query}`, { method: 'GET' })
}

export function getCandidate(candidacyId: string) {
  return apiFetch<CandidateDetailResponse>(`/candidacies/${candidacyId}`, { method: 'GET' })
}

export function reviewCandidacy(candidacyId: string) {
  return apiFetch<CandidacyResponse>(`/candidacies/${candidacyId}/review`, { method: 'POST' })
}

export function shortlistCandidacy(candidacyId: string) {
  return apiFetch<CandidacyResponse>(`/candidacies/${candidacyId}/shortlist`, { method: 'POST' })
}

export function interviewCandidacy(candidacyId: string) {
  return apiFetch<CandidacyResponse>(`/candidacies/${candidacyId}/interview`, { method: 'POST' })
}

export function rejectCandidacy(candidacyId: string) {
  return apiFetch<CandidacyResponse>(`/candidacies/${candidacyId}/reject`, { method: 'POST' })
}

export interface SendOfferInput {
  startDate: string
  endDate: string
  responseDeadline: string
  location?: string
  details?: string
}

export function sendOffer(candidacyId: string, input: SendOfferInput) {
  return apiFetch<InternshipOfferResponse>(`/candidacies/${candidacyId}/offer`, { method: 'POST', body: input })
}

export function withdrawOffer(candidacyId: string, offerId: string) {
  return apiFetch<MessageResponse>(`/candidacies/${candidacyId}/offers/${offerId}/withdraw`, { method: 'POST' })
}

// ---------------------------------------------------------------- university

export function listTargetRequests(universityId: string) {
  return apiFetch<TargetRequestResponse[]>(`/universities/${universityId}/opportunity-requests`, { method: 'GET' })
}

export function listEligibleStudents(universityId: string, targetId: string) {
  return apiFetch<EligibleStudentResponse[]>(
    `/universities/${universityId}/opportunity-requests/${targetId}/eligible-students`,
    { method: 'GET' },
  )
}

export function listUniversityNominations(universityId: string) {
  return apiFetch<NominationResponse[]>(`/universities/${universityId}/nominations`, { method: 'GET' })
}

export function nominateStudent(universityId: string, input: { opportunityId: string; studentUserId: string; note?: string }) {
  return apiFetch<NominationResponse>(`/universities/${universityId}/nominations`, { method: 'POST', body: input })
}

export function withdrawNomination(universityId: string, nominationId: string) {
  return apiFetch<NominationResponse>(`/universities/${universityId}/nominations/${nominationId}/withdraw`, {
    method: 'POST',
  })
}
