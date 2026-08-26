package com.fursadhub.verification.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentVerificationCaseRepository {

    StudentVerificationCase save(StudentVerificationCase verificationCase);

    Optional<StudentVerificationCase> findById(UUID id);

    Optional<StudentVerificationCase> findByEnrollmentId(UUID enrollmentId);

    List<StudentVerificationCase> findByEnrollmentIdIn(List<UUID> enrollmentIds);

    /**
     * The platform escalation queue (Phase 7): cases a university has escalated and that nobody has
     * resolved yet. Resolved cases drop out on their own, so the queue empties as work is done.
     */
    List<StudentVerificationCase> findEscalatedUnresolved();
}
