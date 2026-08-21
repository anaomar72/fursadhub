package com.fursadhub.verification.infrastructure.persistence;

import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class StudentVerificationCaseRepositoryAdapter implements StudentVerificationCaseRepository {

    private final JpaStudentVerificationCaseRepository jpaRepository;

    StudentVerificationCaseRepositoryAdapter(JpaStudentVerificationCaseRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public StudentVerificationCase save(StudentVerificationCase verificationCase) {
        return jpaRepository.save(verificationCase);
    }

    @Override
    public Optional<StudentVerificationCase> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<StudentVerificationCase> findByEnrollmentId(UUID enrollmentId) {
        return jpaRepository.findByEnrollmentId(enrollmentId);
    }

    @Override
    public List<StudentVerificationCase> findByEnrollmentIdIn(List<UUID> enrollmentIds) {
        return jpaRepository.findByEnrollmentIdIn(enrollmentIds);
    }
}
