import type { StatusTone } from '../../../components/ui'
import type { OpportunityMode, OpportunityStatus, OpportunityTargetStatus } from '../types'

/**
 * One status→tone mapping for opportunities, shared by the organization list, detail and dashboard
 * so the same opportunity never reads as "success" on one screen and "neutral" on another
 * (BRAND_AND_UI_GUIDELINES.md section 17 — one status visual language).
 *
 * <p>Status is never conveyed by colour alone: every consumer pairs these tones with translated
 * text. CLOSED and CANCELLED deliberately differ — one ran its course, the other was called off.
 */
export const OPPORTUNITY_STATUS_TONE: Record<OpportunityStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
}

/**
 * Sourcing mode is not a status, so it gets the neutral treatment everywhere — the three modes are
 * equal choices, not stages, and tinting one of them would imply a ranking the domain does not have
 * (CLAUDE.md section 32).
 */
export const OPPORTUNITY_MODE_TONE: Record<OpportunityMode, StatusTone> = {
  PUBLIC: 'neutral',
  UNIVERSITY_TARGETED: 'neutral',
  HYBRID: 'neutral',
}

export const OPPORTUNITY_TARGET_STATUS_TONE: Record<OpportunityTargetStatus, StatusTone> = {
  REQUESTED: 'info',
  ACKNOWLEDGED: 'info',
  NOMINATING: 'warning',
  COMPLETED: 'success',
  DECLINED: 'neutral',
  EXPIRED: 'neutral',
}
