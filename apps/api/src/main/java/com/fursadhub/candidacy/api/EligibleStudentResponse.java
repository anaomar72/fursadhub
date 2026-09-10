package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.NominationQueryService;

/**
 * A student the calling staff member may nominate. Only ever contains students in their own scope.
 *
 * <p>{@code professional} lets the nominator read who they are putting forward — headline, summary,
 * skills, links — instead of choosing a name from a dropdown. It is the student's own professional
 * presentation and nothing else: no enrollment evidence, no CV, no internal identifiers beyond the
 * ids this endpoint already returned.
 */
public record EligibleStudentResponse(
        String studentUserId,
        String email,
        String fullName,
        String departmentId,
        String studentNumber,
        String program,
        String academicYear,
        boolean alreadyNominated,
        com.fursadhub.student.domain.StudentProfessionalProfile professional) {

    public static EligibleStudentResponse from(NominationQueryService.EligibleStudentRow row) {
        return new EligibleStudentResponse(
                row.studentUserId().toString(),
                row.email(),
                row.fullName(),
                row.departmentId().toString(),
                row.studentNumber(),
                row.program(),
                row.academicYear(),
                row.alreadyNominated(),
                row.professional());
    }
}
