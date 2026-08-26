package com.fursadhub.compliance.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One user's current position on one optional processing purpose (CLAUDE.md section 49).
 *
 * <p>One row per user per consent type, updated in place — but BOTH timestamps are kept. A withdrawn
 * consent still records that it was once granted and when, which is the evidence that matters if the
 * processing is ever questioned. Deleting the row on withdrawal would erase exactly that.
 *
 * <p>Withdrawal is always available and never affects anything else: it is not terms acceptance, and
 * nothing about running an internship depends on it.
 */
@Entity
@Table(name = "consent_records")
public class ConsentRecord {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "consent_type", nullable = false, length = 60)
    private ConsentType consentType;

    @Column(nullable = false)
    private boolean granted;

    @Column(name = "granted_at")
    private Instant grantedAt;

    @Column(name = "withdrawn_at")
    private Instant withdrawnAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ConsentRecord() {
    }

    public static ConsentRecord initial(UUID userId, ConsentType consentType) {
        ConsentRecord record = new ConsentRecord();
        record.id = UUID.randomUUID();
        record.userId = userId;
        record.consentType = consentType;
        // Consent is never assumed. A user who has never answered has not consented.
        record.granted = false;
        record.updatedAt = Instant.now();
        return record;
    }

    public void grant() {
        this.granted = true;
        this.grantedAt = Instant.now();
        this.withdrawnAt = null;
        this.updatedAt = this.grantedAt;
    }

    public void withdraw() {
        this.granted = false;
        this.withdrawnAt = Instant.now();
        this.updatedAt = this.withdrawnAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public ConsentType getConsentType() {
        return consentType;
    }

    public boolean isGranted() {
        return granted;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }

    public Instant getWithdrawnAt() {
        return withdrawnAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
