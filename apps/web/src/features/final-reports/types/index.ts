/** Phase 6 final-report contracts (CLAUDE.md sections 45/47). */

export type FinalReportState = 'DRAFT' | 'SUBMITTED' | 'NEEDS_REVISION' | 'APPROVED'

/**
 * The report's lifecycle plus its document's METADATA.
 *
 * There is deliberately no URL field here and none on the backend response: the document is private
 * and is fetched through an authorized, audited endpoint rather than linked to. A future field named
 * `url` would silently undo that.
 */
export interface FinalReportResponse {
  id: string
  placementId: string
  state: FinalReportState
  hasDocument: boolean
  documentFilename: string | null
  documentSizeBytes: number | null
  submittedAt: string | null
  reviewedAt: string | null
  reviewComment: string | null
  /** Whether the STUDENT may still replace the document. */
  fileEditable: boolean
  createdAt: string
  updatedAt: string
}
