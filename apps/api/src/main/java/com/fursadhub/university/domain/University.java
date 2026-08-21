package com.fursadhub.university.domain;

import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A university tenant (CLAUDE.md section 25). Onboarding a new university/setting its institution
 * verification status is an admin-console concern deferred to Phase 7 (CLAUDE.md section 50:
 * "manual admin processing is acceptable for the pilot") — for the pilot, rows are created only by
 * Flyway seed data (the Jamhuriya University pilot tenant), so this entity is read-only from Java.
 */
@Entity
@Table(name = "universities")
public class University {

    @Id
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(length = 120)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private InstitutionVerificationStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected University() {
    }

    public boolean isVerified() {
        return status == InstitutionVerificationStatus.VERIFIED;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public String getCity() {
        return city;
    }

    public InstitutionVerificationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
