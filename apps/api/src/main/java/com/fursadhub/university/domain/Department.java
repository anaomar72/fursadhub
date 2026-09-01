package com.fursadhub.university.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A department within a university (CLAUDE.md section 25).
 *
 * <p>Phase 8 makes universities self-registering with no seeded pilot tenant, so a university that
 * registers with zero departments would be unable to scope a coordinator or enroll a student into
 * anything — this entity's own {@code register()}/{@code updateProfile()} exist so a university can
 * build its own department structure rather than depending on a seed that no longer exists.
 */
@Entity
@Table(name = "departments")
public class Department {

    @Id
    private UUID id;

    @Column(name = "university_id", nullable = false)
    private UUID universityId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Department() {
    }

    public static Department register(UUID universityId, String name, String code) {
        Department department = new Department();
        department.id = UUID.randomUUID();
        department.universityId = universityId;
        department.name = name;
        department.code = code;
        department.createdAt = Instant.now();
        return department;
    }

    /** The code is stable identity for enrollment/staff-scoping records elsewhere; only the name changes. */
    public void updateName(String name) {
        this.name = name;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUniversityId() {
        return universityId;
    }

    public String getName() {
        return name;
    }

    public String getCode() {
        return code;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
