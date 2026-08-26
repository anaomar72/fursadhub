import type { StatusTone } from '../../../components/ui'
import type { WeeklyLogState } from '../types'

/**
 * One state→tone mapping shared by the student and university views, so a log never reads as
 * "warning" on one screen and "info" on another (BRAND_AND_UI_GUIDELINES.md section 17).
 *
 * SUBMITTED and RETURNED_FOR_CHANGES carry different tones on purpose: one is waiting on the
 * supervisor, the other is waiting on the student, and flattening them into a single "in progress"
 * would hide whose turn it is. Every consumer pairs the tone with translated text.
 */
export const WEEKLY_LOG_STATE_TONE: Record<WeeklyLogState, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  RETURNED_FOR_CHANGES: 'warning',
  REVIEWED: 'success',
}
