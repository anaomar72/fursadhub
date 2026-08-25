import type { StatusTone } from '../../../components/ui'
import type { PlacementStatus } from '../types'

/**
 * One status→tone mapping shared by the student, university and organization areas, so a placement
 * never reads as "success" on one screen and "warning" on another
 * (BRAND_AND_UI_GUIDELINES.md section 17 — one status visual language).
 *
 * Status is never conveyed by colour alone: every consumer pairs these tones with translated text.
 *
 * CANCELLED and TERMINATED deliberately carry DIFFERENT tones. They are different outcomes — one
 * never started, the other ended early — and flattening them into a single grey "ended" would hide
 * a distinction the domain treats as significant.
 */
export const PLACEMENT_STATUS_TONE: Record<PlacementStatus, StatusTone> = {
  PLANNED: 'info',
  ACTIVE: 'success',
  COMPLETION_PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  TERMINATED: 'danger',
}
