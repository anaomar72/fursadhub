package com.fursadhub.verification.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentVerificationCaseRepository {

    StudentVerificationCase save(StudentVerificationCase verificationCase);

    Optional<StudentVerificationCase> findById(UUID id);

    Optional<StudentVerificationCase> findByEnrollmentId(UUID enrollmentId);

    List<StudentVerificationCase> findByEnrollmentIdIn(List<UUID> enrollmentIds);
}
