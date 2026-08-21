package com.fursadhub.student.domain;

import java.util.Optional;
import java.util.UUID;

public interface StudentProfileRepository {

    StudentProfile save(StudentProfile profile);

    Optional<StudentProfile> findByUserId(UUID userId);
}
