package com.fursadhub.student.infrastructure.persistence;

import com.fursadhub.student.domain.StudentProfile;
import com.fursadhub.student.domain.StudentProfileRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class StudentProfileRepositoryAdapter implements StudentProfileRepository {

    private final JpaStudentProfileRepository jpaRepository;

    StudentProfileRepositoryAdapter(JpaStudentProfileRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public StudentProfile save(StudentProfile profile) {
        return jpaRepository.save(profile);
    }

    @Override
    public Optional<StudentProfile> findByUserId(UUID userId) {
        return jpaRepository.findById(userId);
    }
}
