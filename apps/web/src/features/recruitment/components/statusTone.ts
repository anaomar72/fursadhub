import type { StatusTone } from '../../../components/ui'
import type { CandidacyStatus, NominationStatus, OfferStatus } from '../types'

/**
 * One status→tone mapping shared by student, university and organization areas, so the same
 * candidacy state never reads as "success" in one screen and "warning" in another
 * (BRAND_AND_UI_GUIDELINES.md section 17 — one status visual language).
 *
 * Status is never conveyed by colour alone: every consumer pairs these tones with translated text.
 */
export const CANDIDACY_STATUS_TONE: Record<CandidacyStatus, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  SHORTLISTED: 'info',
  INTERVIEW: 'info',
  OFFERED: 'warning',
  OFFER_DECLINED: 'neutral',
  OFFER_EXPIRED: 'neutral',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
}

export const NOMINATION_STATUS_TONE: Record<NominationStatus, StatusTone> = {
  PENDING_STUDENT_CONSENT: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  WITHDRAWN: 'neutral',
}

export const OFFER_STATUS_TONE: Record<OfferStatus, StatusTone> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  EXPIRED: 'neutral',
  WITHDRAWN: 'neutral',
}
