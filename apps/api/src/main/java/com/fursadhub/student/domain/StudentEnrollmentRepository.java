package com.fursadhub.student.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentEnrollmentRepository {

    StudentEnrollment save(StudentEnrollment enrollment);

    Optional<StudentEnrollment> findById(UUID id);

    Optional<StudentEnrollment> findByStudentUserId(UUID studentUserId);

    boolean existsByStudentUserId(UUID studentUserId);

    boolean existsByUniversityIdAndStudentNumber(UUID universityId, String studentNumber);

    List<StudentEnrollment> findByUniversityId(UUID universityId);

    List<StudentEnrollment> findByUniversityIdAndDepartmentId(UUID universityId, UUID departmentId);
}
