package com.fursadhub.student.api;

import com.fursadhub.student.domain.StudentEnrollment;

public record StudentEnrollmentResponse(
        String id,
        String universityId,
        String departmentId,
        String studentNumber,
        String program,
        String academicYear,
        String verificationStatus) {

    public static StudentEnrollmentResponse from(StudentEnrollment enrollment) {
        return new StudentEnrollmentResponse(
                enrollment.getId().toString(),
                enrollment.getUniversityId().toString(),
                enrollment.getDepartmentId().toString(),
                enrollment.getStudentNumber(),
                enrollment.getProgram(),
                enrollment.getAcademicYear(),
                enrollment.getVerificationStatus().name());
    }
}
