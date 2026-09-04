import {
  PLACEMENT_RECORD_FANOUT_LIMIT,
  usePlacementRecords,
  type PlacementRecordRow,
  type PlacementRecords,
} from '../../placements/hooks/usePlacementRecords'
import type { PlacementResponse } from '../../placements/types'

/**
 * The university area's view of the shared per-placement fan-out.
 *
 * <p>The mechanism itself lives in {@code features/placements/hooks/usePlacementRecords} because
 * both supervision portals need it — the university side reads weekly logs and the final report,
 * the organization side reads attendance and the evaluation. This module narrows it to the three
 * sections a UNIVERSITY caller is entitled to, so the type system stops a university screen from
 * asking for the organization's evaluation and vice versa.
 */
export const SUPERVISION_FANOUT_LIMIT = PLACEMENT_RECORD_FANOUT_LIMIT

/**
 * Academic supervision plus attendance. Weekly logs and the final report go through
 * {@code requireAcademicReadAccess}, which admits the owning student and university staff in scope
 * only; attendance goes through {@code requireWorkplaceReadAccess}, which additionally admits the
 * host organization.
 */
export type SupervisionSection = 'weekly-logs' | 'final-report' | 'attendance'

export type SupervisionRow<S extends SupervisionSection> = PlacementRecordRow<S>
export type SupervisionRecords<S extends SupervisionSection> = PlacementRecords<S>

export function useSupervisionRecords<S extends SupervisionSection>(
  placements: PlacementResponse[],
  section: S,
  enabled = true,
): SupervisionRecords<S> {
  return usePlacementRecords(placements, section, enabled)
}
