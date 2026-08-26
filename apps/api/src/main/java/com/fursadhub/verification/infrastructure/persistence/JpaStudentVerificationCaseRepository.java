package com.fursadhub.verification.infrastructure.persistence;

import com.fursadhub.verification.domain.StudentVerificationCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaStudentVerificationCaseRepository extends JpaRepository<StudentVerificationCase, UUID> {

    Optional<StudentVerificationCase> findByEnrollmentId(UUID enrollmentId);

    List<StudentVerificationCase> findByEnrollmentIdIn(List<UUID> enrollmentIds);

    @Query("""
            SELECT c FROM StudentVerificationCase c
            WHERE c.escalatedAt IS NOT NULL
              AND c.status NOT IN (
                    com.fursadhub.verification.domain.StudentVerificationStatus.VERIFIED,
                    com.fursadhub.verification.domain.StudentVerificationStatus.REJECTED,
                    com.fursadhub.verification.domain.StudentVerificationStatus.REVOKED)
            ORDER BY c.escalatedAt ASC
            """)
    List<StudentVerificationCase> findEscalatedUnresolved();
}
