/** Phase 7 privacy contracts (CLAUDE.md sections 49-50). */

export type PrivacyRequestType =
  | 'ACCESS'
  | 'CORRECTION'
  | 'ERASURE'
  | 'RESTRICTION'
  | 'PORTABILITY'
  | 'OBJECTION'

export type PrivacyRequestState = 'SUBMITTED' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED'

export interface PrivacyRequest {
  id: string
  requestType: PrivacyRequestType
  state: PrivacyRequestState
  details: string | null
  submittedAt: string
  reviewedAt: string | null
  resolutionNote: string | null
}

/**
 * Optional processing the user may separately consent to.
 *
 * Deliberately NOT derived from terms acceptance (CLAUDE.md section 49): accepting the Terms is a
 * contractual act, while these are freely given and freely withdrawn.
 */
export type ConsentType = 'PRODUCT_UPDATE_EMAIL' | 'OPPORTUNITY_RECOMMENDATION_EMAIL'

export interface ConsentRecord {
  consentType: ConsentType
  granted: boolean
  grantedAt: string | null
  withdrawnAt: string | null
}
