package com.fursadhub.verification.infrastructure.persistence;

import com.fursadhub.verification.domain.StudentVerificationCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaStudentVerificationCaseRepository extends JpaRepository<StudentVerificationCase, UUID> {

    Optional<StudentVerificationCase> findByEnrollmentId(UUID enrollmentId);

    List<StudentVerificationCase> findByEnrollmentIdIn(List<UUID> enrollmentIds);
}
