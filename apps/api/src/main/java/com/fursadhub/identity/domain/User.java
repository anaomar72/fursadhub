package com.fursadhub.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A FursadHub account. Contextual roles/memberships (student, university staff, organization
 * staff, admin) are separate concerns layered on top starting Phase 2+ (CLAUDE.md section 23) —
 * this entity only carries identity/authentication state.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private UserStatus status;

    @Column(name = "preferred_locale", nullable = false, length = 5)
    private String preferredLocale;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public static User register(String normalizedEmail, String passwordHash, String preferredLocale) {
        Instant now = Instant.now();
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = normalizedEmail;
        user.passwordHash = passwordHash;
        user.status = UserStatus.PENDING_CONTACT_VERIFICATION;
        user.preferredLocale = preferredLocale;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    public void markEmailVerified() {
        this.emailVerifiedAt = Instant.now();
        if (this.status == UserStatus.PENDING_CONTACT_VERIFICATION) {
            this.status = UserStatus.ACTIVE;
        }
        this.updatedAt = Instant.now();
    }

    public void changePasswordHash(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        this.updatedAt = Instant.now();
    }

    /** State transition only — the admin endpoint that triggers this is out of scope until Phase 7. */
    public void suspend() {
        this.status = UserStatus.SUSPENDED;
        this.updatedAt = Instant.now();
    }

    /** State transition only — the admin endpoint that triggers this is out of scope until Phase 7. */
    public void close() {
        this.status = UserStatus.CLOSED;
        this.updatedAt = Instant.now();
    }

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public UserStatus getStatus() {
        return status;
    }

    public String getPreferredLocale() {
        return preferredLocale;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
