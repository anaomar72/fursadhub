import type { StatusTone } from '../../../components/ui'
import type { OpportunityMode } from '../types'

/**
 * The opportunity status and target-status machines moved to the cross-feature registry
 * (`lib/status/statusTones.ts`) in Phase 6; re-exported here so existing imports keep working.
 */
export { OPPORTUNITY_STATUS_TONE, OPPORTUNITY_TARGET_STATUS_TONE } from '../../../lib/status/statusTones'

export const OPPORTUNITY_MODE_TONE: Record<OpportunityMode, StatusTone> = {
  PUBLIC: 'neutral',
  UNIVERSITY_TARGETED: 'neutral',
  HYBRID: 'neutral',
}
