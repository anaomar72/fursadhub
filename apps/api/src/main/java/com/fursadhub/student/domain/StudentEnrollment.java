package com.fursadhub.student.domain;

import com.fursadhub.verification.domain.StudentVerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A student's claimed university enrollment (CLAUDE.md section 28). A student has at most one
 * enrollment at a time (enforced by a unique constraint on {@code student_user_id}); the
 * university/student-number pair is separately unique per CLAUDE.md section 28's critical
 * invariant. {@code verificationStatus} is a cache of the current/latest
 * {@code StudentVerificationCase} status, kept in sync by the verification module in the same
 * transaction as each case transition, so other modules (Phase 3+ eligibility checks) can query it
 * cheaply without joining the case table.
 */
@Entity
@Table(name = "student_enrollments")
public class StudentEnrollment {

    @Id
    private UUID id;

    @Column(name = "student_user_id", nullable = false, unique = true)
    private UUID studentUserId;

    @Column(name = "university_id", nullable = false)
    private UUID universityId;

    @Column(name = "department_id", nullable = false)
    private UUID departmentId;

    @Column(name = "student_number", nullable = false, length = 60)
    private String studentNumber;

    @Column(nullable = false, length = 255)
    private String program;

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 40)
    private StudentVerificationStatus verificationStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentEnrollment() {
    }

    public static StudentEnrollment claim(
            UUID studentUserId, UUID universityId, UUID departmentId, String studentNumber, String program, String academicYear) {
        Instant now = Instant.now();
        StudentEnrollment enrollment = new StudentEnrollment();
        enrollment.id = UUID.randomUUID();
        enrollment.studentUserId = studentUserId;
        enrollment.universityId = universityId;
        enrollment.departmentId = departmentId;
        enrollment.studentNumber = studentNumber;
        enrollment.program = program;
        enrollment.academicYear = academicYear;
        enrollment.verificationStatus = StudentVerificationStatus.DRAFT;
        enrollment.createdAt = now;
        enrollment.updatedAt = now;
        return enrollment;
    }

    public void updateClaim(UUID universityId, UUID departmentId, String studentNumber, String program, String academicYear) {
        this.universityId = universityId;
        this.departmentId = departmentId;
        this.studentNumber = studentNumber;
        this.program = program;
        this.academicYear = academicYear;
        this.updatedAt = Instant.now();
    }

    public void syncVerificationStatus(StudentVerificationStatus status) {
        this.verificationStatus = status;
        this.updatedAt = Instant.now();
    }

    public boolean isVerified() {
        return verificationStatus == StudentVerificationStatus.VERIFIED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getStudentUserId() {
        return studentUserId;
    }

    public UUID getUniversityId() {
        return universityId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public String getStudentNumber() {
        return studentNumber;
    }

    public String getProgram() {
        return program;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public StudentVerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
