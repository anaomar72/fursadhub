package com.fursadhub.student.infrastructure.persistence;

import com.fursadhub.student.domain.StudentEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaStudentEnrollmentRepository extends JpaRepository<StudentEnrollment, UUID> {

    Optional<StudentEnrollment> findByStudentUserId(UUID studentUserId);

    boolean existsByStudentUserId(UUID studentUserId);

    boolean existsByUniversityIdAndStudentNumber(UUID universityId, String studentNumber);

    List<StudentEnrollment> findByUniversityId(UUID universityId);

    List<StudentEnrollment> findByUniversityIdAndDepartmentId(UUID universityId, UUID departmentId);
}
