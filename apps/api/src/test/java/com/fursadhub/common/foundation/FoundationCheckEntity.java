package com.fursadhub.common.foundation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Test-only entity mapped to the Phase 0 foundation-proof table (see V1 migration).
 * Exists purely to prove the Testcontainers PostgreSQL + Flyway + JPA pipeline works;
 * it is intentionally not part of main application code.
 */
@Entity
@Table(name = "phase0_foundation_check")
public class FoundationCheckEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected FoundationCheckEntity() {
    }

    public FoundationCheckEntity(UUID id, String note, Instant createdAt) {
        this.id = id;
        this.note = note;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
