/** Phase 4 recruitment contracts. Mirrors the backend DTOs exactly (CLAUDE.md section 10/11). */

export type CandidacySource = 'SELF_APPLICATION' | 'UNIVERSITY_NOMINATION' | 'BOTH'

export type CandidacyStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFERED'
  | 'OFFER_DECLINED'
  | 'OFFER_EXPIRED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'

export type NominationStatus = 'PENDING_STUDENT_CONSENT' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN'

export type ScreeningQuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'YES_NO' | 'SINGLE_CHOICE'

/** The backend caps this at five per opportunity; the UI mirrors the same limit. */
export const MAX_SCREENING_QUESTIONS = 5

export interface ScreeningQuestionResponse {
  id: string
  prompt: string
  type: ScreeningQuestionType
  required: boolean
  position: number
  choices: string[]
}

export interface InternshipOfferResponse {
  id: string
  candidacyId: string
  startDate: string
  endDate: string
  responseDeadline: string
  location: string | null
  details: string | null
  status: OfferStatus
  createdAt: string
  respondedAt: string | null
}

export interface CandidacyResponse {
  id: string
  opportunityId: string
  organizationId: string
  source: CandidacySource
  status: CandidacyStatus
  createdAt: string
  updatedAt: string
}

/** One row of the organization's single, unified candidate pool. */
export interface CandidateRowResponse {
  candidacyId: string
  studentUserId: string
  studentEmail: string | null
  studentFullName: string | null
  source: CandidacySource
  status: CandidacyStatus
  createdAt: string
  liveOffer: InternshipOfferResponse | null
}

export interface CandidateDetailResponse {
  candidacyId: string
  opportunityId: string
  studentUserId: string
  studentEmail: string | null
  studentFullName: string | null
  source: CandidacySource
  status: CandidacyStatus
  createdAt: string
  answers: { questionId: string; answer: string }[]
  offers: InternshipOfferResponse[]
  history: {
    eventType: string
    fromStatus: CandidacyStatus | null
    toStatus: CandidacyStatus | null
    metadata: string | null
    occurredAt: string
  }[]
}

export interface StudentCandidacyResponse {
  id: string
  opportunityId: string
  opportunityTitle: string
  source: CandidacySource
  status: CandidacyStatus
  createdAt: string
  liveOffer: InternshipOfferResponse | null
}

export interface StudentNominationResponse {
  id: string
  opportunityId: string
  opportunityTitle: string | null
  organizationName: string | null
  status: NominationStatus
  note: string | null
  createdAt: string
  respondedAt: string | null
}

export interface NominationResponse {
  id: string
  opportunityId: string
  opportunityTitle: string | null
  organizationName: string | null
  studentUserId: string
  studentEmail: string | null
  studentFullName: string | null
  departmentId: string
  status: NominationStatus
  note: string | null
  createdAt: string
  respondedAt: string | null
}

export interface TargetRequestResponse {
  targetId: string
  opportunityId: string
  opportunityTitle: string
  organizationName: string
  mode: string
  requestedNominees: number
  liveNominationCount: number
  nominationDeadline: string
  targetStatus: string
  eligibleDepartmentIds: string[]
  startDate: string
  endDate: string
}

export interface EligibleStudentResponse {
  studentUserId: string
  email: string | null
  fullName: string | null
  departmentId: string
  studentNumber: string
  program: string
  academicYear: string
  alreadyNominated: boolean
}

/** Accepting an offer returns the single placement it created (CLAUDE.md section 38). */
export interface OfferAcceptanceResponse {
  offer: InternshipOfferResponse
  candidacy: CandidacyResponse
  placement: {
    id: string
    status: string
    startDate: string
    endDate: string
    location: string | null
  }
  alreadyAccepted: boolean
}
