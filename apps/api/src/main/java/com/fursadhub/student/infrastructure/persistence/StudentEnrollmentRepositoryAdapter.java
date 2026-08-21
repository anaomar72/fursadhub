package com.fursadhub.student.infrastructure.persistence;

import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class StudentEnrollmentRepositoryAdapter implements StudentEnrollmentRepository {

    private final JpaStudentEnrollmentRepository jpaRepository;

    StudentEnrollmentRepositoryAdapter(JpaStudentEnrollmentRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public StudentEnrollment save(StudentEnrollment enrollment) {
        return jpaRepository.save(enrollment);
    }

    @Override
    public Optional<StudentEnrollment> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<StudentEnrollment> findByStudentUserId(UUID studentUserId) {
        return jpaRepository.findByStudentUserId(studentUserId);
    }

    @Override
    public boolean existsByStudentUserId(UUID studentUserId) {
        return jpaRepository.existsByStudentUserId(studentUserId);
    }

    @Override
    public boolean existsByUniversityIdAndStudentNumber(UUID universityId, String studentNumber) {
        return jpaRepository.existsByUniversityIdAndStudentNumber(universityId, studentNumber);
    }

    @Override
    public List<StudentEnrollment> findByUniversityId(UUID universityId) {
        return jpaRepository.findByUniversityId(universityId);
    }

    @Override
    public List<StudentEnrollment> findByUniversityIdAndDepartmentId(UUID universityId, UUID departmentId) {
        return jpaRepository.findByUniversityIdAndDepartmentId(universityId, departmentId);
    }
}
