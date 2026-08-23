package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.NominationQueryService;

/** A student the calling staff member may nominate. Only ever contains students in their own scope. */
public record EligibleStudentResponse(
        String studentUserId,
        String email,
        String fullName,
        String departmentId,
        String studentNumber,
        String program,
        String academicYear,
        boolean alreadyNominated) {

    public static EligibleStudentResponse from(NominationQueryService.EligibleStudentRow row) {
        return new EligibleStudentResponse(
                row.studentUserId().toString(),
                row.email(),
                row.fullName(),
                row.departmentId().toString(),
                row.studentNumber(),
                row.program(),
                row.academicYear(),
                row.alreadyNominated());
    }
}
