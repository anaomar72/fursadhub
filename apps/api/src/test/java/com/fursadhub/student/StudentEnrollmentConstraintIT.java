package com.fursadhub.student;

import com.fursadhub.candidacy.AbstractPhase4IT;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The {@code UNIQUE(university_id, student_number)} identity invariant proven at the DATABASE level
 * (CLAUDE.md sections 28 and 52 — critical invariants must have PostgreSQL constraints in addition
 * to Java checks).
 *
 * <p>Every statement here goes straight to PostgreSQL through {@code JdbcTemplate}, deliberately
 * bypassing {@code StudentEnrollmentService}'s {@code existsByUniversityIdAndStudentNumber}
 * pre-check. That is the whole point: the API-level rejection is already covered by
 * {@code UniversityVerificationAuthorizationIT#duplicateStudentNumberAtSameUniversityIsBlocked},
 * and that test would keep passing even if the migration's constraint were dropped. These tests
 * fail if the constraint is not really there — so a future migration cannot quietly remove the last
 * line of defence against two accounts claiming one student identity.
 *
 * <p>Runs against Testcontainers PostgreSQL via {@link AbstractPhase4IT} (CLAUDE.md section 59 — no
 * H2), reusing the shared container rather than starting another.
 */
class StudentEnrollmentConstraintIT extends AbstractPhase4IT {

    private static final String UNIVERSITY_STUDENT_NUMBER_CONSTRAINT =
            "uk_student_enrollments_university_student_number";
    private static final String ONE_ENROLLMENT_PER_STUDENT_CONSTRAINT = "uk_student_enrollments_student";

    /** Inserts an enrollment row directly, with no application-level duplicate check in the way. */
    private void insertEnrollmentRow(UUID studentUserId, UUID universityId, UUID departmentId, String studentNumber) {
        jdbcTemplate.update(
                "INSERT INTO student_enrollments (id, student_user_id, university_id, department_id, student_number, "
                        + "program, academic_year, verification_status, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, 'Computer Science', '2025/2026', 'DRAFT', now(), now())",
                UUID.randomUUID(), studentUserId, universityId, departmentId, studentNumber);
    }

    private UUID newStudentUserId(String prefix) {
        String email = uniqueEmail(prefix);
        registerVerifiedUser(email);
        return userIdOf(email);
    }

    @Test
    void postgresRejectsTwoEnrollmentsSharingAUniversityAndStudentNumber() {
        UUID universityId = insertVerifiedUniversity("Constraint University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        String sharedNumber = "SN-" + UUID.randomUUID().toString().substring(0, 8);

        insertEnrollmentRow(newStudentUserId("dup-db-first"), universityId, departmentId, sharedNumber);

        UUID secondStudent = newStudentUserId("dup-db-second");
        assertThatThrownBy(() -> insertEnrollmentRow(secondStudent, universityId, departmentId, sharedNumber))
                .as("the database itself must refuse a duplicate university/student-number identity")
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasStackTraceContaining(UNIVERSITY_STUDENT_NUMBER_CONSTRAINT);
    }

    /** Different department, same university and number — still one identity, still refused. */
    @Test
    void theConstraintIgnoresTheDepartmentAndCatchesTheDuplicateAnyway() {
        UUID universityId = insertVerifiedUniversity("Constraint University " + UUID.randomUUID());
        UUID computerScience = insertDepartment(universityId, "Computer Science", "CS");
        UUID business = insertDepartment(universityId, "Business", "BA");
        String sharedNumber = "SN-" + UUID.randomUUID().toString().substring(0, 8);

        insertEnrollmentRow(newStudentUserId("dep-dup-first"), universityId, computerScience, sharedNumber);

        UUID secondStudent = newStudentUserId("dep-dup-second");
        assertThatThrownBy(() -> insertEnrollmentRow(secondStudent, universityId, business, sharedNumber))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasStackTraceContaining(UNIVERSITY_STUDENT_NUMBER_CONSTRAINT);
    }

    /**
     * The invariant is scoped to one university, not global. Two universities numbering their
     * students independently must not collide — otherwise the first university to use "0001" would
     * lock every other university out of it.
     */
    @Test
    void theSameStudentNumberAtADifferentUniversityIsAllowed() {
        UUID firstUniversity = insertVerifiedUniversity("University A " + UUID.randomUUID());
        UUID firstDepartment = insertDepartment(firstUniversity, "Computer Science", "CS");
        UUID secondUniversity = insertVerifiedUniversity("University B " + UUID.randomUUID());
        UUID secondDepartment = insertDepartment(secondUniversity, "Computer Science", "CS");
        String sharedNumber = "SN-" + UUID.randomUUID().toString().substring(0, 8);

        insertEnrollmentRow(newStudentUserId("cross-uni-first"), firstUniversity, firstDepartment, sharedNumber);

        UUID secondStudent = newStudentUserId("cross-uni-second");
        assertThatCode(() -> insertEnrollmentRow(secondStudent, secondUniversity, secondDepartment, sharedNumber))
                .doesNotThrowAnyException();
        assertThat(countEnrollmentsWithNumber(sharedNumber)).isEqualTo(2);
    }

    /** One student, one enrollment — the second row is refused by the database, not only by the service. */
    @Test
    void postgresRejectsASecondEnrollmentForTheSameStudent() {
        UUID universityId = insertVerifiedUniversity("Constraint University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        UUID studentUserId = newStudentUserId("one-enrollment");

        insertEnrollmentRow(studentUserId, universityId, departmentId, "SN-" + UUID.randomUUID().toString().substring(0, 8));

        assertThatThrownBy(() -> insertEnrollmentRow(
                studentUserId, universityId, departmentId, "SN-" + UUID.randomUUID().toString().substring(0, 8)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasStackTraceContaining(ONE_ENROLLMENT_PER_STUDENT_CONSTRAINT);
    }

    /** Both constraints are declared on the table, under the names the migration gives them. */
    @Test
    void bothIdentityConstraintsExistOnTheEnrollmentsTable() {
        assertThat(uniqueConstraintNames()).contains(
                UNIVERSITY_STUDENT_NUMBER_CONSTRAINT, ONE_ENROLLMENT_PER_STUDENT_CONSTRAINT);
    }

    private java.util.List<String> uniqueConstraintNames() {
        return jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.table_constraints "
                        + "WHERE table_name = 'student_enrollments' AND constraint_type = 'UNIQUE'",
                String.class);
    }

    private int countEnrollmentsWithNumber(String studentNumber) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM student_enrollments WHERE student_number = ?", Integer.class, studentNumber);
        return count == null ? 0 : count;
    }
}
