/** Phase 6 evaluation contracts (CLAUDE.md section 44). */

export type EvaluationState = 'DRAFT' | 'SUBMITTED' | 'FINAL'

/**
 * The FIXED V1 rating fields. This is a closed list on purpose: FursadHub has no rubric builder, so
 * the form is written once here rather than rendered from a configurable schema.
 */
export const EVALUATION_RATING_FIELDS = [
  'professionalismRating',
  'reliabilityRating',
  'communicationRating',
  'workPerformanceRating',
  'teamworkRating',
  'overallRating',
] as const

export type EvaluationRatingField = (typeof EVALUATION_RATING_FIELDS)[number]

export interface EvaluationResponse {
  id: string
  placementId: string
  professionalismRating: number | null
  reliabilityRating: number | null
  communicationRating: number | null
  workPerformanceRating: number | null
  teamworkRating: number | null
  overallRating: number | null
  strengths: string | null
  improvementAreas: string | null
  finalComments: string | null
  state: EvaluationState
  submittedAt: string | null
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EvaluationDraftInput {
  professionalismRating?: number | null
  reliabilityRating?: number | null
  communicationRating?: number | null
  workPerformanceRating?: number | null
  teamworkRating?: number | null
  overallRating?: number | null
  strengths?: string | null
  improvementAreas?: string | null
  finalComments?: string | null
}
