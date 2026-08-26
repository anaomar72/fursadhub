/** Phase 7 in-app notification contracts (CLAUDE.md sections 55-56). */

/**
 * The notification's stable type code.
 *
 * There is deliberately NO rendered message on the wire. The backend stores a code plus parameters,
 * and this client renders the wording from its own translation files — which is what lets the same
 * notification read in English for one person and Somali for another, and keep reading correctly if
 * the wording is later revised.
 */
export type NotificationType =
  | 'STUDENT_VERIFICATION_NEEDS_MORE_EVIDENCE'
  | 'STUDENT_VERIFICATION_VERIFIED'
  | 'STUDENT_VERIFICATION_REJECTED'
  | 'ORGANIZATION_VERIFIED'
  | 'ORGANIZATION_VERIFICATION_CHANGES_REQUESTED'
  | 'ORGANIZATION_VERIFICATION_REJECTED'
  | 'ORGANIZATION_VERIFICATION_SUSPENDED'
  | 'ORGANIZATION_VERIFICATION_REVOKED'
  | 'WEEKLY_LOG_RETURNED'
  | 'WEEKLY_LOG_REVIEWED'
  | 'ATTENDANCE_DISPUTED'
  | 'ATTENDANCE_RESOLVED'
  | 'EVALUATION_FINALIZED'
  | 'FINAL_REPORT_REVISION_REQUESTED'
  | 'FINAL_REPORT_APPROVED'
  | 'DEFENSE_SCHEDULED'
  | 'DEFENSE_RESULT_RECORDED'
  | 'PLACEMENT_COMPLETED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REACTIVATED'
  | 'PRIVACY_REQUEST_RECEIVED'
  | 'PRIVACY_REQUEST_COMPLETED'
  | 'PRIVACY_REQUEST_REJECTED'
  | 'LEGAL_DOCUMENT_UPDATED'

export interface NotificationItem {
  id: string
  /** Typed loosely on purpose: an unknown code from a newer API renders a generic line. */
  type: NotificationType | string
  /** Translation parameters — week numbers, attempt numbers, organization names. */
  payload: Record<string, string | number>
  /** Always a relative in-app path, never an absolute URL. */
  linkPath: string | null
  readAt: string | null
  createdAt: string
}

export interface NotificationPage {
  content: NotificationItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
