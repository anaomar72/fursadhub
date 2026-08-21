package com.fursadhub.university.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** A department within a university (CLAUDE.md section 25). Seeded alongside its university for the pilot. */
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
