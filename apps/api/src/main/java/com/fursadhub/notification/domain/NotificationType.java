package com.fursadhub.notification.domain;

/**
 * Stable notification type codes (CLAUDE.md sections 11, 55, 56).
 *
 * <p>The code is the contract. A notification row stores this enum name plus a small JSON payload of
 * parameters — never rendered English prose — so the frontend renders it in English or Somali from
 * its own translation files, and the same stored row reads correctly in either language and keeps
 * reading correctly if the wording is later changed.
 *
 * <p>Adding a value here means adding a matching translation key in {@code locales/en/notifications.json}
 * and {@code locales/so/notifications.json}. The frontend falls back to a generic line for a code it
 * does not recognise, so a missing key degrades rather than breaks.
 */
public enum NotificationType {

    // ---------------------------------------------------------------- verification (Phase 2/3/7)

    /** A university reviewer needs more evidence from the student. */
    STUDENT_VERIFICATION_NEEDS_MORE_EVIDENCE,
    STUDENT_VERIFICATION_VERIFIED,
    STUDENT_VERIFICATION_REJECTED,

    ORGANIZATION_VERIFIED,
    ORGANIZATION_VERIFICATION_CHANGES_REQUESTED,
    ORGANIZATION_VERIFICATION_REJECTED,
    ORGANIZATION_VERIFICATION_SUSPENDED,
    ORGANIZATION_VERIFICATION_REVOKED,

    // ---------------------------------------------------------------- internship management (Phase 6)

    WEEKLY_LOG_RETURNED,
    WEEKLY_LOG_REVIEWED,
    ATTENDANCE_DISPUTED,
    ATTENDANCE_RESOLVED,
    EVALUATION_FINALIZED,
    FINAL_REPORT_REVISION_REQUESTED,
    FINAL_REPORT_APPROVED,
    DEFENSE_SCHEDULED,
    DEFENSE_RESULT_RECORDED,
    PLACEMENT_COMPLETED,

    // ---------------------------------------------------------------- account and compliance (Phase 7)

    ACCOUNT_SUSPENDED,
    ACCOUNT_REACTIVATED,
    PRIVACY_REQUEST_RECEIVED,
    PRIVACY_REQUEST_COMPLETED,
    PRIVACY_REQUEST_REJECTED,
    /** A new version of the Terms or Privacy Policy needs the user's acceptance. */
    LEGAL_DOCUMENT_UPDATED
}
