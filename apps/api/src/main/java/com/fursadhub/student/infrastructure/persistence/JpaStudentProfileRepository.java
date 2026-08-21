package com.fursadhub.student.infrastructure.persistence;

import com.fursadhub.student.domain.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface JpaStudentProfileRepository extends JpaRepository<StudentProfile, UUID> {
}
