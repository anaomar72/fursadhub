package com.fursadhub.internshipmanagement.domain;

/**
 * The five — and only five — completion requirements (CLAUDE.md section 41).
 *
 * <p>Each carries the stable error code reported when it is enabled but unsatisfied, so the
 * frontend branches on a code rather than on English prose (CLAUDE.md section 11).
 */
public enum CompletionRequirementType {
    WEEKLY_LOGS("WEEKLY_LOGS_INCOMPLETE"),
    ATTENDANCE("ATTENDANCE_INCOMPLETE"),
    ORGANIZATION_EVALUATION("ORGANIZATION_EVALUATION_INCOMPLETE"),
    FINAL_REPORT("FINAL_REPORT_NOT_APPROVED"),
    DEFENSE("DEFENSE_NOT_PASSED");

    private final String unmetCode;

    CompletionRequirementType(String unmetCode) {
        this.unmetCode = unmetCode;
    }

    public String unmetCode() {
        return unmetCode;
    }
}
